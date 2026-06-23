/**
 * Built-in proposal/contract templates that a workspace can install with one
 * click. The first one reproduces the "Termo de Adesão" used as the reference
 * document (Rede Connect Telecom), authored with Tiptap-safe HTML (only native
 * nodes — headings, paragraphs, tables, lists) plus {{TOKEN}} variables wrapped
 * in <span data-variable> so they render as chips in the editor while remaining
 * resolvable by the {{...}} regex.
 */

export type DefaultProposalTemplate = {
  name: string;
  description: string;
  category: 'proposta' | 'contrato' | 'termo';
  content: string;
};

const v = (token: string): string => `<span data-variable="${token}">{{${token}}}</span>`;

const CONNECT_TERMO: DefaultProposalTemplate = {
  name: 'Termo de Adesão (Combo) — Rede Connect',
  description: 'Termo de adesão padrão de Comunicação Multimídia + Serviço de Valor Adicionado (combo).',
  category: 'termo',
  content: `
<h1>TERMO DE ADESÃO AO CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE COMUNICAÇÃO MULTIMÍDIA, SERVIÇO DE VALOR ADICIONADO, LOCAÇÃO E OUTRAS AVENÇAS</h1>
<p>Por este instrumento particular, o ASSINANTE abaixo qualificado contrata e adere ao Serviço da PRESTADORA:</p>

<h2>DADOS DA PRESTADORA</h2>
<table>
  <tbody>
    <tr><td><strong>Nome Empresarial</strong></td><td>${v('PRESTADORA.RAZAO_SOCIAL')}</td><td><strong>Nome Fantasia</strong></td><td>${v('PRESTADORA.NOME_FANTASIA')}</td></tr>
    <tr><td><strong>CNPJ</strong></td><td>${v('PRESTADORA.CNPJ')}</td><td><strong>Inscrição Estadual</strong></td><td>${v('PRESTADORA.INSCRICAO_ESTADUAL')}</td></tr>
    <tr><td><strong>Ato de Autorização – Anatel</strong></td><td>${v('PRESTADORA.ATO_AUTORIZACAO_ANATEL')}</td><td><strong>Telefone</strong></td><td>${v('PRESTADORA.TELEFONE')}</td></tr>
    <tr><td><strong>Endereço</strong></td><td>${v('PRESTADORA.ENDERECO')}</td><td><strong>Bairro</strong></td><td>${v('PRESTADORA.BAIRRO')}</td></tr>
    <tr><td><strong>Cidade/UF</strong></td><td>${v('PRESTADORA.CIDADE_UF')}</td><td><strong>CEP</strong></td><td>${v('PRESTADORA.CEP')}</td></tr>
    <tr><td><strong>Site</strong></td><td>${v('PRESTADORA.SITE')}</td><td><strong>E-mail</strong></td><td>${v('PRESTADORA.EMAIL')}</td></tr>
  </tbody>
</table>

<h2>QUALIFICAÇÃO DO ASSINANTE</h2>
<table>
  <tbody>
    <tr><td><strong>Nome</strong></td><td>${v('PESSOA.NOME')}</td><td><strong>CPF</strong></td><td>${v('PESSOA.CPF')}</td></tr>
    <tr><td><strong>Data de Nascimento</strong></td><td>${v('PESSOA.DATANASCIMENTO')}</td><td><strong>RG</strong></td><td>${v('PESSOA.IDENTIDADE')}</td></tr>
    <tr><td><strong>Nome da Mãe</strong></td><td>${v('PESSOA.NOMEDAMAE')}</td><td><strong>País</strong></td><td>${v('PESSOA.PAIS')}</td></tr>
    <tr><td><strong>Endereço</strong></td><td>${v('PESSOA.RUA')}</td><td><strong>Nº</strong></td><td>${v('PESSOA.NUMERO')}</td></tr>
    <tr><td><strong>Bairro</strong></td><td>${v('PESSOA.BAIRRO')}</td><td><strong>Estado</strong></td><td>${v('PESSOA.ESTADO')}</td></tr>
    <tr><td><strong>Cidade</strong></td><td>${v('PESSOA.CIDADE')}</td><td><strong>CEP</strong></td><td>${v('PESSOA.CEP')}</td></tr>
    <tr><td><strong>E-mail</strong></td><td>${v('PESSOA.EMAIL')}</td><td><strong>Tel/WhatsApp</strong></td><td>${v('PESSOA.CELULAR')}</td></tr>
  </tbody>
</table>

<p>O presente termo é regulamentado pelo Código Brasileiro do Consumidor e pelos Regulamentos referentes aos Serviços de Comunicação Multimídia (SCM) e Serviço de Valor Adicionado (SVA), no qual as opções abaixo determinadas são de responsabilidade do ASSINANTE.</p>

<h2>Dados Técnicos e Comerciais do Plano de Acesso e Modalidade escolhida</h2>
<table>
  <tbody>
    <tr><td><strong>Plano</strong></td><td>${v('ITEM.DESCRICAO')}</td></tr>
    <tr><td><strong>Velocidade de download</strong></td><td>${v('CONEXAO.DOWNLOADMAX')}</td></tr>
    <tr><td><strong>Velocidade de upload</strong></td><td>${v('CONEXAO.UPLOADMAX')}</td></tr>
    <tr><td><strong>Pacote Digital (SVA)</strong></td><td>(X) Sim ( ) Não</td></tr>
    <tr><td><strong>Modalidade</strong></td><td>( ) Pré-pago (X) Pós-pago</td></tr>
    <tr><td><strong>Banda Máxima</strong></td><td>95% da velocidade contratada</td></tr>
    <tr><td><strong>Franquia de Tráfego</strong></td><td>Ilimitado</td></tr>
    <tr><td><strong>Quant. Pontos de Conexão</strong></td><td>1 ponto em ${v('PESSOA.CIDADE')}</td></tr>
    <tr><td><strong>IP</strong></td><td>( ) Fixo (X) Variável</td></tr>
    <tr><td><strong>Prazo Contratual</strong></td><td>Indeterminado</td></tr>
    <tr><td><strong>Valor Mensal</strong></td><td>R$ ${v('CONTRATO.VALOR')}</td></tr>
    <tr><td><strong>Data de Vencimento</strong></td><td>${v('CONTRATO.DIA_COBRANCA')}</td></tr>
    <tr><td><strong>Fidelidade</strong></td><td>(X) Sim ( ) Não</td></tr>
    <tr><td><strong>Taxa de Instalação com Fidelidade</strong></td><td>Isento</td></tr>
    <tr><td><strong>Taxa de Instalação sem Fidelidade</strong></td><td>R$ 800,00 (oitocentos reais)</td></tr>
    <tr><td><strong>Prazo de Permanência Mínima</strong></td><td>12 (doze) meses, a contar da data de contratação dos serviços</td></tr>
    <tr><td><strong>Sujeito à multa rescisória em caso de cancelamento antecipado</strong></td><td>(X) Sim ( ) Não</td></tr>
    <tr><td><strong>Equipamentos</strong></td><td>( ) Próprio (X) Comodato da Contratada ( ) Locação</td></tr>
  </tbody>
</table>

<p><strong>Obs:</strong> Clientes que optarem por encerrar o contrato antes do prazo de 12 (doze) meses, além da multa contratual prevista pela fidelidade, estarão sujeitos ao pagamento adicional da taxa equivalente ao valor da última mensalidade.</p>
<p>Autoriza o recebimento de mensagem publicitária em seu telefone móvel: (X) Sim ( ) Não.</p>
<p>Forma de Pagamento: (X) Boleto Bancário ( ) Débito Automático.</p>
<p>Autoriza que o documento de cobrança, correspondências, comunicados e notificações sejam encaminhados por quaisquer meios eletrônicos (e-mail, SMS, WhatsApp, app, área do cliente, dentre outros): (X) Sim ( ) Não.</p>

<h2>PACOTE DIGITAL (SVA)</h2>
<p>O PACOTE DIGITAL compreende-se no escopo do Serviço de Valor Adicionado as facilidades, conteúdos e aplicativos fornecidos pela PRESTADORA, os quais são disponibilizados mediante oferta combinada a todos os CLIENTES, a depender do plano adquirido, sendo certo que seu cancelamento não importará em qualquer abatimento nas mensalidades, eis que há a possibilidade de aquisição isolada de cada serviço.</p>
<ol>
  <li><strong>CONNECT PLAY TV</strong> – Nosso serviço de TV digital oferece qualidade superior de imagem e som em alta definição, com uma grade de 180 canais abrangendo conteúdos para todos os gostos. Com funcionalidades interativas, acesso a conteúdos exclusivos e compatibilidade com dispositivos móveis, garantimos tecnologia de ponta e suporte excepcional para a melhor experiência em entretenimento.</li>
  <li><strong>CONNECT PLAY TV PREMIUM</strong> – Além de toda a qualidade de imagem e som em alta definição e funcionalidades interativas, o plano Premium disponibiliza uma grade ainda mais completa com 250 canais, somada a um catálogo exclusivo de filmes e séries, atualizado mensalmente.</li>
  <li><strong>BITTRAINERS</strong> – Seus assinantes recebem acesso Premium ilimitado ao App Bittrainners, que auxilia na rotina de hábitos saudáveis, otimização dos treinos e liberdade para definir seus horários, com economia ao contratar serviços e produtos do segmento fitness.</li>
  <li><strong>BITTOPICS</strong> – Plataforma que reúne grandes profissionais da área da saúde e bem-estar para trazer as melhores informações e guiar os usuários para uma vida mais saudável e equilibrada. Conteúdos sobre Nutrição, Medicina, Atividade Física, Mente e Família.</li>
  <li><strong>BITBOOK</strong> – Plataforma de e-books e audiobooks online, voltada para o gênero saúde e bem-estar. Os leitores têm acesso ao acervo de forma ilimitada para ler e ouvir quantas vezes desejarem.</li>
  <li><strong>GLOBOPLAY</strong> – Plataforma de streaming do Grupo Globo, com novelas, séries, filmes, programas de TV, documentários e conteúdos originais, além de produções internacionais e conteúdo ao vivo.</li>
  <li><strong>TELECINE</strong> – Plataforma de streaming voltada para filmes, com acesso a seis canais lineares de cinema, sob demanda e ao vivo. Vigência de 12 meses a partir da assinatura contratual.</li>
  <li><strong>PREMIERE</strong> – Canal por assinatura especializado em eventos esportivos, com foco no futebol (Campeonato Brasileiro Séries A e B, estaduais e outros torneios). Vigência de 12 meses a partir da assinatura contratual.</li>
  <li><strong>TELEMEDICINA</strong> – Pronto-Atendimento Digital (PA Digital): serviço médico de urgência e emergência realizado online, com profissionais especializados. Poderá ser utilizado pelo assinante 48 horas após a contratação.</li>
  <li><strong>AUXÍLIO FUNERAL</strong> – Benefício concedido em razão do falecimento do titular ou familiares (cônjuge ou filhos até 21 anos), podendo chegar a R$ 5.000,00. Utilizável a partir do primeiro dia do mês subsequente à contratação, respeitada a carência.</li>
  <li><strong>MESTRE CURSOS</strong> – Plataforma de treinamentos simples, fácil e rápida, com cursos em diversas áreas do conhecimento corporativo: comportamental, gerencial, operacional, e outros.</li>
  <li><strong>CLIPSY</strong> – Plataforma digital voltada para o desenvolvimento pessoal, guiando o indivíduo em um processo de autoconhecimento, definição de propósito, planejamento, organização e monitoramento de sua evolução.</li>
  <li><strong>CÂMERAS DE SEGURANÇA</strong> – Fornecimento de câmeras em regime de comodato, sem custos de aquisição. Instalação e manutenção gratuitas, com acervo de gravação de até 2 dias. Em caso de inadimplência, o acesso é bloqueado até a regularização dos débitos.</li>
</ol>
<p><strong>NOTA IMPORTANTE</strong> – Atente-se aos produtos com vigências limitadas por promoções. As condições promocionais têm prazo de validade e podem sofrer alterações após o término da vigência promocional/contratual.</p>

<h2>CLÁUSULA DE PERMANÊNCIA</h2>
<p>O ASSINANTE declara estar ciente que os serviços ora adquiridos, seja na modalidade avulsa ou conjunta, são ofertados com preços mais vantajosos em relação aos valores integrais dos serviços, justamente em face da fidelidade.</p>
<p>O ASSINANTE declara estar ciente que a PRESTADORA concedeu os seguintes benefícios, válidos exclusivamente durante o prazo de fidelidade contratual:</p>
<table>
  <tbody>
    <tr><td><strong>PLANO</strong></td><td><strong>ORIGEM DO VALOR SEM DESCONTO</strong></td><td><strong>VALOR COM FIDELIDADE</strong></td><td><strong>DESCONTO COM FIDELIDADE</strong></td><td><strong>VALOR TOTAL</strong></td></tr>
    <tr><td>${v('ITEM.DESCRICAO')}</td><td>Instalação R$ 800,00</td><td>R$ 0,00</td><td>R$ 800,00</td><td>R$ 800,00</td></tr>
  </tbody>
</table>
<p>Desta forma, na hipótese de rescisão contratual antes de findo o prazo de fidelidade, o ASSINANTE pagará à PRESTADORA, a título de multa rescisória, a importância correspondente ao benefício que efetivamente usufruiu, proporcionalmente aos meses restantes do contrato, cujo valor será corrigido pelo IGP-M ou outro que eventualmente vier a substituí-lo.</p>

<h2>TABELA DE MULTA – RESCISÃO ANTECIPADA</h2>
<p>Desconto proporcional mensal – Taxa de instalação: R$ 66,67. Valor total dos benefícios concedidos: R$ 800,00.</p>
<table>
  <tbody>
    <tr><td><strong>Mês</strong></td><td><strong>Multa</strong></td><td><strong>Mês</strong></td><td><strong>Multa</strong></td><td><strong>Mês</strong></td><td><strong>Multa</strong></td></tr>
    <tr><td>1º mês</td><td>R$ 800,00</td><td>5º mês</td><td>R$ 533,33</td><td>9º mês</td><td>R$ 266,67</td></tr>
    <tr><td>2º mês</td><td>R$ 733,33</td><td>6º mês</td><td>R$ 466,67</td><td>10º mês</td><td>R$ 200,00</td></tr>
    <tr><td>3º mês</td><td>R$ 666,67</td><td>7º mês</td><td>R$ 400,00</td><td>11º mês</td><td>R$ 133,33</td></tr>
    <tr><td>4º mês</td><td>R$ 600,00</td><td>8º mês</td><td>R$ 333,33</td><td>12º mês</td><td>R$ 66,67</td></tr>
  </tbody>
</table>
<p>Não obstante, o ASSINANTE não estará sujeito ao pagamento da multa apenas nas hipóteses: a) superveniente incapacidade técnica da PRESTADORA para o cumprimento das condições técnicas e funcionais dos serviços contratados, no mesmo endereço de instalação; b) cancelamento solicitado em razão de descumprimento de obrigação contratual ou legal por parte da PRESTADORA.</p>
<p>A adesão do ASSINANTE a outra oferta da PRESTADORA (promocional ou não), antes de decorridos 12 (doze) meses da contratação, implicará em descumprimento da fidelidade ora avençada, ensejando, também, a incidência da multa prevista neste Contrato de Permanência.</p>
<p>O ASSINANTE declara estar ciente de que lhe é facultada a contratação avulsa e individual de qualquer serviço ofertado pela PRESTADORA, contudo sem os benefícios que decorrem da fidelidade.</p>
<p>O presente Termo de Adesão vigorará enquanto estiver vigente o CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE COMUNICAÇÃO MULTIMÍDIA, SERVIÇO DE VALOR ADICIONADO, LOCAÇÃO E OUTRAS AVENÇAS.</p>

<h2>DECLARAÇÃO DE CONCORDÂNCIA</h2>
<p>Declaro, para os devidos fins, que são corretos os dados cadastrais e informações por mim prestadas neste instrumento. Declaro ainda que os documentos apresentados para formalização deste contrato e as cópias entregues à PRESTADORA pertencem à minha pessoa, tendo ciência das sanções civis e criminais caso preste declarações falsas. Declaro estar ciente que a assinatura deste instrumento representa expressa concordância aos termos e condições do CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE COMUNICAÇÃO MULTIMÍDIA, SERVIÇO DE VALOR ADICIONADO, LOCAÇÃO E OUTRAS AVENÇAS, que juntamente com este TERMO DE ADESÃO formam um só instrumento de direito, tendo lido e entendido claramente as condições ajustadas para esta contratação.</p>
<p>O valor pactuado neste contrato será reajustado anualmente, sempre na mesma data de sua assinatura, com base na variação acumulada do Índice Geral de Preços do Mercado (IGP-M), ou por outro índice oficial que vier a substituí-lo.</p>
<p>A adesão ao presente Contrato importa na ciência e anuência do ASSINANTE de que o uso de seus dados pessoais (nome, telefone, e-mail) pela PRESTADORA é condição primordial para o fornecimento dos serviços, nos moldes do §3º, do art. 9º da Lei 13.709/18.</p>
<p>Fica, desde já, eleito o foro da comarca da cidade onde foi contratado o serviço como o competente para dirimir qualquer conflito ou controvérsia oriunda deste Termo, em detrimento de quaisquer outros, por mais especiais ou privilegiados que sejam.</p>

<p>${v('CONTRATO.ENDERECO.CIDADE')}, ______ de ____________________ de __________.</p>
<p>___________________________________<br>${v('PESSOA.NOME')} — ${v('PESSOA.CPF')}<br><strong>ASSINANTE</strong></p>
<p>___________________________________<br>${v('PRESTADORA.RAZAO_SOCIAL')} — ${v('PRESTADORA.CNPJ')}<br><strong>PRESTADORA</strong></p>
<p><strong>Testemunhas (quando aplicável):</strong></p>
<table>
  <tbody>
    <tr><td><strong>1. Nome:</strong></td><td>&nbsp;</td><td><strong>2. Nome:</strong></td><td>&nbsp;</td></tr>
    <tr><td><strong>CPF:</strong></td><td>&nbsp;</td><td><strong>CPF:</strong></td><td>&nbsp;</td></tr>
  </tbody>
</table>
`.trim(),
};

export const DEFAULT_PROPOSAL_TEMPLATES: DefaultProposalTemplate[] = [CONNECT_TERMO];
