# Appmax Suporte — Desativar e-mails automáticos ao cliente (prod)

## Assunto
Solicitação para desativar os e-mails automáticos enviados pela Appmax ao cliente final (ambiente de produção)

## Mensagem

Olá, equipe Appmax,

Somos a loja **sagrox** e utilizamos a API da Appmax em **produção** para processar pagamentos (cartão de crédito, Pix e boleto) em nosso e-commerce. Nosso sistema envia seus próprios e-mails transacionais aos clientes em todas as etapas (pedido criado, pagamento aprovado, pedido enviado e reembolso), por isso gostaríamos de **desativar qualquer e-mail automático enviado pela Appmax ao cliente final** para evitar mensagens duplicadas.

### Dados da conta
- Merchant (externalKey): `sagrox`
- App ID: `1453`
- Ambiente: produção (`api.appmax.com.br`)

### O que pedimos
- Desativar o envio de e-mails automáticos ao cliente final nos eventos de pedido/pagamento/reembolso (ou em todas as notificações da Appmax que cheguem ao comprador).
- Se não for possível desativar por loja no Painel Administrativo, pedimos que seja desativado pela equipe Appmax no nosso cadastro.

### Contexto
- Os e-mails do nosso e-commerce já cobrem todas as notificações ao cliente.
- Queremos que a Appmax envie apenas as instruções de pagamento (Pix QR Code / boleto) em caso de necessidade operacional, e não comunicações de status duplicadas.

Agradecemos o suporte.