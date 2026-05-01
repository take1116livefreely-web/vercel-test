import { fetchCategoriesWithSystems } from '@/lib/fetchCategories'
import NewIncidentForm from './NewIncidentForm'

export default async function NewIncidentPage() {
  const categories = await fetchCategoriesWithSystems()
  return <NewIncidentForm categories={categories} />
}
