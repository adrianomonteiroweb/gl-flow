import Link from 'next/link';

import { VexnetLogo } from '@workspace/ui/components/logos/vexnet';
import { Separator } from '@workspace/ui/components/separator';

const sections = [
  {
    title: '1. Introdução',
    content: `A glflow CRM ("nós", "nosso") se compromete a proteger a privacidade dos dados dos usuários e contatos gerenciados por meio de nossa plataforma. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e compartilhamos informações no contexto do uso do nosso sistema de gerenciamento de relacionamento com o cliente.

Ao utilizar a plataforma glflow CRM, você concorda com os termos descritos nesta política.`,
  },
  {
    title: '2. Dados Coletados',
    content: `No âmbito da integração com o WhatsApp Business API, coletamos e armazenamos os seguintes dados dos contatos:

• **Nome do contato:** nome fornecido pelo próprio usuário ou identificado via perfil do WhatsApp.
• **Número de telefone:** número de WhatsApp utilizado para comunicação.
• **Mensagens trocadas:** conteúdo das conversas realizadas via WhatsApp, incluindo mensagens de texto, áudios, imagens e documentos enviados e recebidos.
• **Metadados da conversa:** data, hora e status das mensagens (enviada, entregue, lida).

Não coletamos dados financeiros, de saúde, senhas ou outros dados sensíveis dos contatos.`,
  },
  {
    title: '3. Finalidade do Uso dos Dados',
    content: `Os dados coletados são utilizados exclusivamente para as seguintes finalidades:

• **Gerenciamento de atendimento:** organizar e acompanhar o histórico de conversas entre a equipe e os contatos.
• **Gestão de pipeline:** categorizar contatos em etapas de atendimento conforme o fluxo de trabalho da empresa.
• **Histórico de interações:** permitir que a equipe visualize todo o histórico de comunicação com um contato para oferecer um atendimento mais eficiente e contextualizado.
• **Notificações internas:** alertar membros da equipe sobre novas mensagens ou eventos relevantes.

Os dados não são utilizados para fins de marketing não solicitado, análise comportamental de terceiros ou qualquer finalidade não descrita acima.`,
  },
  {
    title: '4. Compartilhamento com Terceiros',
    content: `Para viabilizar a integração com o WhatsApp, os dados transitam pela infraestrutura da **Meta Platforms, Inc.** (responsável pelo WhatsApp Business API). O uso da API do WhatsApp está sujeito aos Termos de Serviço e à Política de Privacidade da Meta.

Além da Meta, não compartilhamos os dados coletados com terceiros, exceto:

• Quando exigido por lei, decisão judicial ou autoridade competente.
• Para proteger os direitos legais da glflow CRM ou de terceiros.
• Com prestadores de serviços de infraestrutura (como hospedagem em nuvem) que operam sob acordos de confidencialidade e processamento de dados.

Não vendemos, alugamos ou cedemos dados pessoais a terceiros para fins comerciais.`,
  },
  {
    title: '5. Armazenamento e Segurança',
    content: `Os dados são armazenados em servidores seguros com acesso restrito. Adotamos medidas técnicas e organizacionais para proteger as informações contra acesso não autorizado, perda, alteração ou divulgação indevida, incluindo:

• Comunicação criptografada via HTTPS/TLS.
• Controle de acesso por autenticação de usuários.
• Restrição de acesso por função (permissões por equipe).

Os dados são mantidos pelo tempo necessário para a prestação dos serviços ou conforme exigido por obrigações legais. Após esse período, os dados são excluídos de forma segura.`,
  },
  {
    title: '6. Direitos dos Titulares e Exclusão de Dados',
    content: `Os titulares dos dados têm os seguintes direitos, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018):

• **Acesso:** solicitar uma cópia dos dados pessoais armazenados sobre você.
• **Correção:** solicitar a correção de dados incompletos, inexatos ou desatualizados.
• **Exclusão:** solicitar a exclusão dos dados pessoais tratados com seu consentimento.
• **Portabilidade:** solicitar a transferência dos seus dados para outro fornecedor.
• **Revogação do consentimento:** retirar o consentimento dado anteriormente para o tratamento dos dados.

Para exercer qualquer um desses direitos, entre em contato conosco pelo e-mail indicado na seção abaixo. Atenderemos à sua solicitação em até 15 dias úteis.`,
  },
  {
    title: '7. Contato do Responsável',
    content: `Para dúvidas, solicitações ou reclamações relacionadas a esta Política de Privacidade ou ao tratamento de dados pessoais, entre em contato com nosso responsável pelo tratamento de dados (DPO):

**glflow CRM**
E-mail: privacidade@glflowacrm.com.br

Caso não obtenha resposta satisfatória, você pode registrar uma reclamação junto à Autoridade Nacional de Proteção de Dados (ANPD) pelo site gov.br/anpd.`,
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="h-full overflow-y-auto bg-background text-foreground">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <VexnetLogo />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground">Última atualização: abril de 2026</p>
        </div>

        <Separator />

        <div className="space-y-8">
          {sections.map((section, index) => (
            <div key={index} className="space-y-3">
              <h2 className="text-base font-semibold">{section.title}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.content.split('\n').map((line, i) => {
                  const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                  return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: boldLine }} />;
                })}
              </div>
              {index < sections.length - 1 && <Separator className="mt-6" />}
            </div>
          ))}
        </div>

        <Separator />

        <p className="text-xs text-muted-foreground text-center pb-4">© {new Date().getFullYear()} glflow CRM. Todos os direitos reservados.</p>
      </main>
    </div>
  );
}
