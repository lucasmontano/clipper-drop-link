import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Button,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface MagicLinkEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
}

export const MagicLinkEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
}: MagicLinkEmailProps) => (
  <Html>
    <Head />
    <Preview>🎬 Seu acesso ao Clipper está aqui!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>🎬 Clipper</Heading>
          <Text style={subtitle}>Sua plataforma de clips monetizados</Text>
        </Section>

        <Section style={content}>
          <Heading style={h2}>Bem-vindo ao Clipper! 👋</Heading>
          
          <Text style={text}>
            Estamos animados para ter você conosco! O Clipper é a plataforma onde você pode:
          </Text>

          <ul style={list}>
            <li style={listItem}>📹 <strong>Criar clips virais</strong> de conteúdos do Lucas Montano</li>
            <li style={listItem}>💰 <strong>Ganhar $1 por mil visualizações</strong> nas suas redes sociais</li>
            <li style={listItem}>🚀 <strong>Monetizar seu talento</strong> criativo</li>
          </ul>

          <Section style={buttonContainer}>
            <Button
              href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
              style={button}
            >
              🔗 Acessar Clipper
            </Button>
          </Section>

          <Text style={alternativeText}>
            Ou copie e cole este código temporário:
          </Text>
          <Section style={codeContainer}>
            <code style={code}>{token}</code>
          </Section>

          <Section style={howItWorks}>
            <Heading style={h3}>Como funciona:</Heading>
            <Text style={text}>
              1. 📝 <strong>Escolha seu tipo de clip</strong> (Lucas Montano ou Perssua)<br/>
              2. 🎬 <strong>Crie seu conteúdo</strong> seguindo nossas orientações<br/>
              3. 📤 <strong>Envie seu clip</strong> via arquivo ou link<br/>
              4. 💵 <strong>Receba pelo desempenho</strong> - $1 por mil visualizações!
            </Text>
          </Section>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            Se você não tentou fazer login, pode ignorar este email com segurança.
          </Text>
          <Text style={footerBrand}>
            <strong>Clipper</strong> - Transforme seu talento em renda 🚀
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px',
  maxWidth: '600px',
}

const header = {
  textAlign: 'center' as const,
  marginBottom: '32px',
  padding: '32px 20px',
  backgroundColor: '#ffffff',
  borderRadius: '12px 12px 0 0',
  borderBottom: '3px solid #3b82f6',
}

const content = {
  backgroundColor: '#ffffff',
  padding: '32px 20px',
  borderRadius: '0 0 12px 12px',
}

const h1 = {
  color: '#1e293b',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
}

const subtitle = {
  color: '#64748b',
  fontSize: '16px',
  margin: '0',
  textAlign: 'center' as const,
}

const h2 = {
  color: '#1e293b',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
}

const h3 = {
  color: '#1e293b',
  fontSize: '18px',
  fontWeight: '600',
  margin: '24px 0 12px 0',
}

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const list = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  paddingLeft: '0',
}

const listItem = {
  margin: '8px 0',
  listStyle: 'none',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
  border: 'none',
}

const alternativeText = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '24px 0 8px 0',
}

const codeContainer = {
  textAlign: 'center' as const,
  margin: '16px 0 32px 0',
}

const code = {
  display: 'inline-block',
  padding: '12px 16px',
  backgroundColor: '#f1f5f9',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
  color: '#1e293b',
  fontSize: '16px',
  fontWeight: '600',
  letterSpacing: '2px',
}

const howItWorks = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #e2e8f0',
}

const footer = {
  textAlign: 'center' as const,
  marginTop: '32px',
  paddingTop: '24px',
  borderTop: '1px solid #e2e8f0',
}

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '0 0 16px 0',
}

const footerBrand = {
  color: '#374151',
  fontSize: '14px',
  margin: '0',
}