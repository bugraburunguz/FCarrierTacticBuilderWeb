import { Link, useNavigate } from 'react-router-dom'
import { Card } from '../components/ui'
import { NewCareerForm } from '../components/NewCareerForm'

export function CareerNewPage() {
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card title="Yeni kariyer">
        <NewCareerForm onCreated={() => navigate('/career/desk')} />
      </Card>
      <p className="text-sm text-muted">Gerçek save verin var mı? <Link to="/career/import" className="underline">İçe aktar</Link></p>
    </div>
  )
}
