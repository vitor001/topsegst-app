export default function Loading({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <span>{message}</span>
    </div>
  )
}
