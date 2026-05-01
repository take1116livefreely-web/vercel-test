export type SystemItem = {
  id: string
  name: string
  sort_order: number
}

export type CategoryWithSystems = {
  id: string
  name: string
  sort_order: number
  systems: SystemItem[]
}
