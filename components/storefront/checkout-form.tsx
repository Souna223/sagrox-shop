"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Lock,
  MapPin,
  ShoppingBag,
  Ticket,
  X,
  CreditCard,
  QrCode,
  Barcode,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCartStore, getCartItemSubtotal, getCartItemUnitPrice } from "@/lib/store/cart-store";
import { formatBRL } from "@/lib/format";
import { getMaxInstallments } from "@/lib/prices";
import { toast } from "sonner";
import { PixIcon, BoletoIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/dictionaries";
import { trackClient } from "@/lib/client-tracking";

type CheckoutUser = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type ShippingOption = {
  code: string;
  service: string;
  price: number;
  deliveryDays: number;
};

type CartItem = ReturnType<typeof useCartStore.getState>["items"][number];

type CheckoutFormProps = {
  user: CheckoutUser | null;
};

type Step = "identification" | "delivery" | "payment";

const PAYMENT_METHODS = [
  { id: "PIX", labelKey: "pix", subKey: "pixSub", icon: QrCode },
  { id: "CREDIT_CARD", labelKey: "creditCard", subKey: "creditCardSub", icon: CreditCard },
  { id: "BOLETO", labelKey: "boleto", subKey: "boletoSub", icon: Barcode },
] as const;

export function CheckoutForm({ user }: CheckoutFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);

  const [step, setStep] = useState<Step>("identification");
  const itemsRef = useRef(items);

  useEffect(() => {
    if (itemsRef.current.length > 0) {
      trackClient("BEGIN_CHECKOUT", {
        value: itemsRef.current.reduce((s, i) => s + getCartItemSubtotal(i), 0),
      });
    }
  }, []);

  const [email, setEmail] = useState(user?.email ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");

  const [zip, setZip] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [lookingUpCep, setLookingUpCep] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingCode, setShippingCode] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CREDIT_CARD" | "BOLETO">("PIX");
  const [installments, setInstallments] = useState(1);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    freeShipping: boolean;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = items.reduce((sum, i) => sum + getCartItemSubtotal(i), 0);
  const selectedShipping = shippingOptions.find((o) => o.code === shippingCode) ?? null;
  const shippingFee =
    shippingCode && shippingOptions.length > 0
      ? appliedCoupon?.freeShipping || selectedShipping?.price === 0
        ? 0
        : selectedShipping?.price ?? 0
      : 0;
  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal - discount + shippingFee);
  const maxInstallments = getMaxInstallments(total);
  const cardInstallments = Math.min(installments, maxInstallments);

  const canIdentification = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && name.trim().length >= 3;
  const canDelivery = !!shippingCode && zip.length === 8 && street && number && neighborhood && city && state;

  const totalRef = useRef(total);
  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  useEffect(() => {
    if (step === "payment") {
      trackClient("ADD_PAYMENT_INFO", { value: totalRef.current });
    }
  }, [step]);

  const lookupCep = async () => {
    const digits = zip.replace(/\D/g, "");
    if (digits.length !== 8) {
      toast.error(t.checkout.invalidCep);
      return;
    }
    setLookingUpCep(true);
    try {
      const res = await fetch(`/api/cep?cep=${digits}`);
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? t.checkout.cepNotFound);
        return;
      }
      const a = json.data;
      setStreet(a.street ?? "");
      setNeighborhood(a.neighborhood ?? "");
      setCity(a.city ?? "");
      setState(a.state ?? "");
      setComplement(a.complement ?? "");
      await loadShipping(a.zip);
    } catch {
      toast.error(t.checkout.errorLookingCep);
    } finally {
      setLookingUpCep(false);
    }
  };

  const loadShipping = async (cepDigits: string) => {
    setLoadingShipping(true);
    setShippingOptions([]);
    setShippingCode(null);
    try {
      const res = await fetch("/api/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cep: cepDigits,
          items: items.map((i) => ({
            kind: i.kind ?? "product",
            productId: i.productId,
            variationId: i.variationId ?? null,
            quantity: i.quantity,
          })),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? t.checkout.shippingError);
        return;
      }
      setShippingOptions(json.data);
      setShippingCode(json.data[0]?.code ?? null);
    } catch {
      toast.error(t.checkout.errorCalculatingShipping);
    } finally {
      setLoadingShipping(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? t.checkout.couponInvalid);
        return;
      }
      setAppliedCoupon(json.data);
      toast.success(fmt(t.checkout.couponApplied, { code: json.data.code }));
    } catch {
      toast.error(t.checkout.errorValidatingCoupon);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const placeOrder = async () => {
    if (paymentMethod === "CREDIT_CARD") {
      const digits = cardNumber.replace(/\D/g, "");
      const expParts = cardExpiry.split("/");
      if (digits.length < 12) {
        setError(t.checkout.cardNumberError);
        return;
      }
      if (cardName.trim().length < 3) {
        setError(t.checkout.cardNameError);
        return;
      }
      if (expParts.length !== 2 || expParts[0].length !== 2 || expParts[1].length !== 2) {
        setError(t.checkout.cardExpiryError);
        return;
      }
      if (!/^\d{3,4}$/.test(cardCvv)) {
        setError(t.checkout.cardCvvError);
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const qs = new URLSearchParams(window.location.search);
      const expParts = cardExpiry.split("/");
      const payload = {
        email: email.trim().toLowerCase(),
        customerName: name.trim(),
        cpf: cpf.replace(/\D/g, "") || undefined,
        phone: phone.replace(/\D/g, "") || undefined,
        items: items.map((i) => ({
          kind: i.kind ?? "product",
          productId: i.productId,
          variationId: i.variationId ?? null,
          quantity: i.quantity,
        })),
        shippingAddress: {
          zip: zip.replace(/\D/g, ""),
          street: street.trim(),
          number: number.trim(),
          complement: complement.trim() || undefined,
          neighborhood: neighborhood.trim(),
          city: city.trim(),
          state: state.trim().toUpperCase(),
        },
        shippingService: shippingCode ?? undefined,
        couponCode: appliedCoupon?.code,
        paymentMethod,
        installments: paymentMethod === "CREDIT_CARD" ? cardInstallments : undefined,
        card:
          paymentMethod === "CREDIT_CARD"
            ? {
                number: cardNumber.replace(/\D/g, ""),
                holderName: cardName.trim(),
                expirationMonth: expParts[0] ?? "",
                expirationYear: expParts[1] ? `20${expParts[1]}` : "",
                cvv: cardCvv,
              }
            : undefined,
        sessionId: localStorage.getItem("wbsite.session-id") ?? undefined,
        utmSource: qs.get("utm_source") ?? undefined,
        utmMedium: qs.get("utm_medium") ?? undefined,
        utmCampaign: qs.get("utm_campaign") ?? undefined,
        utmTerm: qs.get("utm_term") ?? undefined,
        utmContent: qs.get("utm_content") ?? undefined,
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? t.checkout.orderError);
        setSubmitting(false);
        return;
      }

      clear();
      router.push(`/checkout/sucesso?order=${json.data.orderNumber}`);
    } catch {
      setError(t.checkout.connectionError);
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="size-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">{t.checkout.emptyCart}</h1>
        <Button render={<Link href="/produtos" />}>{t.checkout.goToStore}</Button>
      </div>
    );
  }

  const steps: { id: Step; label: string }[] = [
    { id: "identification", label: t.checkout.identification },
    { id: "delivery", label: t.checkout.delivery },
    { id: "payment", label: t.checkout.payment },
  ];

  const stepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link href="/" className="mb-4 inline-block" aria-label="Sagrox">
        <Image
          src="/logo.png"
          alt="Sagrox"
          width={1406}
          height={768}
          className="h-10 w-auto object-contain"
        />
      </Link>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">{t.checkout.checkout}</h1>

      <ol className="mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                i <= stepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {i < stepIndex ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={`text-sm ${i <= stepIndex ? "font-semibold" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {i < steps.length - 1 ? <div className="mx-1 h-px w-8 bg-border" /> : null}
          </li>
        ))}
      </ol>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          {error ? (
            <div className="mb-4 flex items-start justify-between rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} aria-label={t.checkout.close}>
                <X className="size-4" />
              </button>
            </div>
          ) : null}

          {step === "identification" ? (
            <section className="space-y-4 rounded-xl border p-6">
              <h2 className="text-lg font-bold">{t.checkout.identification}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">{t.checkout.email}</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.checkout.yourEmail}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">{t.checkout.fullName}</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.checkout.yourName}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t.checkout.cpf}</label>
                  <Input
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t.checkout.phone}</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    inputMode="tel"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep("delivery")} disabled={!canIdentification}>
                  {t.checkout.continue} <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </section>
          ) : null}

          {step === "delivery" ? (
            <section className="space-y-5 rounded-xl border p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{t.checkout.deliveryAddress}</h2>
                <Button variant="ghost" size="sm" onClick={() => setStep("identification")}>
                  <ArrowLeft className="mr-1 size-4" /> {t.checkout.back}
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder={t.checkout.zip}
                  inputMode="numeric"
                />
                <Button variant="secondary" onClick={lookupCep} disabled={lookingUpCep || zip.replace(/\D/g, "").length !== 8}>
                  {lookingUpCep ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
                  {t.checkout.search}
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">{t.checkout.street}</label>
                  <Input value={street} onChange={(e) => setStreet(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t.checkout.number}</label>
                  <Input value={number} onChange={(e) => setNumber(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t.checkout.complement}</label>
                  <Input value={complement} onChange={(e) => setComplement(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t.checkout.neighborhood}</label>
                  <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t.checkout.city}</label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">{t.checkout.state}</label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder={t.checkout.ufPlaceholder}
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Truck className="size-4 text-primary" /> {t.checkout.deliveryOptions}
                </h3>
                {loadingShipping ? (
                  <div className="flex items-center gap-2 rounded-xl border p-4 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> {t.checkout.calculatingShipping}
                  </div>
                ) : shippingOptions.length === 0 ? (
                  <p className="rounded-xl border p-4 text-sm text-muted-foreground">
                    {t.checkout.searchCepForOptions}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {shippingOptions.map((o) => (
                      <label
                        key={o.code}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-colors ${
                          shippingCode === o.code ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`flex size-4 items-center justify-center rounded-full border ${
                              shippingCode === o.code ? "border-primary" : "border-input"
                            }`}
                          >
                            {shippingCode === o.code ? <span className="size-2 rounded-full bg-primary" /> : null}
                          </span>
                          <span>
                            <span className="block text-sm font-medium">{o.service}</span>
                            <span className="block text-xs text-muted-foreground">
                              {fmt(t.checkout.estimatedDays, { n: o.deliveryDays })}
                            </span>
                          </span>
                        </span>
                        <input
                          type="radio"
                          name="shipping"
                          className="sr-only"
                          checked={shippingCode === o.code}
                          onChange={() => setShippingCode(o.code)}
                        />
                        <span className="text-sm font-bold">
                          {o.price === 0 ? t.checkout.free : formatBRL(o.price)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep("payment")} disabled={!canDelivery}>
                  {t.checkout.continue} <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </section>
          ) : null}

          {step === "payment" ? (
            <section className="space-y-6 rounded-xl border p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{t.checkout.paymentMethod}</h2>
                <Button variant="ghost" size="sm" onClick={() => setStep("delivery")}>
                  <ArrowLeft className="mr-1 size-4" /> {t.checkout.back}
                </Button>
              </div>

              <div className="space-y-2">
                {PAYMENT_METHODS.map((m) => (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                      paymentMethod === m.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      className="sr-only"
                      checked={paymentMethod === m.id}
                      onChange={() => setPaymentMethod(m.id)}
                    />
                    <m.icon className="size-5 text-primary" />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{t.checkout[m.labelKey]}</span>
                      <span className="block text-xs text-muted-foreground">{t.checkout[m.subKey]}</span>
                    </span>
                    <span
                      className={`flex size-4 items-center justify-center rounded-full border ${
                        paymentMethod === m.id ? "border-primary" : "border-input"
                      }`}
                    >
                      {paymentMethod === m.id ? <span className="size-2 rounded-full bg-primary" /> : null}
                    </span>
                  </label>
                ))}
              </div>

              {paymentMethod === "CREDIT_CARD" ? (
                <div className="grid gap-4 rounded-xl bg-muted/40 p-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium">{t.checkout.cardNumber}</label>
                    <Input
                      value={cardNumber}
                      onChange={(e) =>
                        setCardNumber(
                          e.target.value.replace(/\D/g, "").slice(0, 19),
                        )
                      }
                      inputMode="numeric"
                      placeholder="0000 0000 0000 0000"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium">{t.checkout.cardName}</label>
                    <Input value={cardName} onChange={(e) => setCardName(e.target.value.toUpperCase())} placeholder={t.checkout.cardNamePlaceholder} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">{t.checkout.expiry}</label>
                    <Input
                      value={cardExpiry}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setCardExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
                      }}
                      inputMode="numeric"
                      placeholder="MM/AA"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">{t.checkout.cvv}</label>
                    <Input
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      inputMode="numeric"
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium">{t.checkout.installments}</label>
                    <Select
                      value={String(cardInstallments)}
                      onValueChange={(v) => setInstallments(Number(v))}
                      items={Array.from({ length: maxInstallments }, (_, i) => ({
                        label: `${i + 1}x de ${formatBRL(total / (i + 1))}${
                          i === 0
                            ? ` ${t.checkout.atSight}`
                            : i + 1 > 1
                              ? ` ${t.checkout.noInterest}`
                              : ""
                        }`,
                        value: String(i + 1),
                      }))}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue className="pr-6">
                          {cardInstallments}x de {formatBRL(total / cardInstallments)}
                          {cardInstallments === 1
                            ? ` ${t.checkout.atSight}`
                            : ` ${t.checkout.noInterest}`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: maxInstallments }, (_, i) => (
                          <SelectItem key={i} value={String(i + 1)}>
                            {i + 1}x de {formatBRL(total / (i + 1))}
                            {i === 0 ? ` ${t.checkout.atSight}` : ` ${t.checkout.noInterest}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
                    <Lock className="size-3.5" /> {t.checkout.secureProcessed}
                  </p>
                </div>
              ) : paymentMethod === "PIX" ? (
                <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4 text-sm">
                  <PixIcon className="size-6 text-primary" />
                  <p className="text-muted-foreground">
                    {t.checkout.pixQrCode}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4 text-sm">
                  <BoletoIcon className="size-6 text-primary" />
                  <p className="text-muted-foreground">
                    {t.checkout.boletoSent}
                  </p>
                </div>
              )}

              <div className="rounded-xl border p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Ticket className="size-4 text-primary" /> {t.checkout.coupon}
                </h3>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                    <span className="font-semibold">{appliedCoupon.code}</span>
                    <span className="flex items-center gap-2">
                      {appliedCoupon.freeShipping
                        ? t.checkout.freeShippingValue
                        : `-${formatBRL(appliedCoupon.discount)}`}
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponCode("");
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={t.checkout.removeCoupon}
                      >
                        <X className="size-4" />
                      </button>
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder={t.checkout.couponPlaceholder}
                    />
                    <Button variant="secondary" onClick={applyCoupon} disabled={validatingCoupon || !couponCode.trim()}>
                      {validatingCoupon ? <Loader2 className="size-4 animate-spin" /> : t.checkout.apply}
                    </Button>
                  </div>
                )}
              </div>

              <Button size="lg" className="w-full" onClick={placeOrder} disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                {submitting
                  ? t.checkout.processingOrder
                  : fmt(t.checkout.finalizeOrder, { value: formatBRL(total) })}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {t.checkout.agreeTerms}
              </p>
            </section>
          ) : null}
        </div>

        <OrderSummary
          items={items}
          subtotal={subtotal}
          discount={discount}
          shippingFee={shippingFee}
          total={total}
          hasShipping={shippingCode !== null}
        />
      </div>
    </div>
  );
}

function OrderSummary({
  items,
  subtotal,
  discount,
  shippingFee,
  total,
  hasShipping,
}: {
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  hasShipping: boolean;
}) {
  const { t } = useI18n();
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <aside className="h-fit rounded-xl border p-5 lg:sticky lg:top-24">
      <h2 className="text-lg font-bold">{t.checkout.orderSummary}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={`${item.productId}:${item.variationId ?? ""}`} className="flex gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              {item.image ? (
                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" unoptimized />
              ) : null}
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                {item.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBRL(getCartItemUnitPrice(item))}
                {item.kind === "product" && getCartItemUnitPrice(item) < item.price ? " / un." : ""}
              </p>
            </div>
            <p className="text-sm font-semibold">{formatBRL(getCartItemSubtotal(item))}</p>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{fmt(t.checkout.subtotalItems, { n: count })}</dt>
          <dd className="font-semibold">{formatBRL(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t.checkout.discount}</dt>
          <dd className={discount > 0 ? "font-semibold text-emerald-600" : "text-muted-foreground"}>
            {discount > 0 ? `-${formatBRL(discount)}` : "—"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t.checkout.shipping}</dt>
          <dd className="font-semibold">{hasShipping ? (shippingFee === 0 ? t.checkout.free : formatBRL(shippingFee)) : "—"}</dd>
        </div>
        <div className="flex justify-between border-t pt-3 text-base">
          <dt className="font-bold">{t.checkout.total}</dt>
          <dd className="text-xl font-bold">{formatBRL(total)}</dd>
        </div>
      </dl>
    </aside>
  );
}
