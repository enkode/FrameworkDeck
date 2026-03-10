import { Construction } from 'lucide-react'

interface Props {
  title: string
  description: string
  features?: string[]
}

export function PlaceholderModule({ title, description, features }: Props) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: 40,
      background: 'var(--bg)',
    }}>
      <Construction size={48} style={{ color: 'var(--tan-dim)', opacity: 0.5 }} />
      <h2 style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 16,
        color: 'var(--cream)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        {title}
      </h2>
      <p style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
        color: 'var(--cream-dim)',
        textAlign: 'center',
        maxWidth: 500,
        lineHeight: 1.6,
      }}>
        {description}
      </p>
      {features && features.length > 0 && (
        <div style={{
          marginTop: 12,
          padding: '16px 24px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          maxWidth: 400,
          width: '100%',
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            color: 'var(--tan)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            PLANNED FEATURES
          </div>
          {features.map((f, i) => (
            <div key={i} style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              color: 'var(--cream-dim)',
              padding: '3px 0',
              borderBottom: i < features.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              {f}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
