import type { Categoria } from '../types'

export const CATEGORIE: { id: Categoria; nome: string }[] = [
  { id: 'tirata', nome: 'Tirata' },
  { id: 'spinta', nome: 'Spinta' },
  { id: 'gambe', nome: 'Gambe' },
  { id: 'core', nome: 'Core' },
  { id: 'skill', nome: 'Skill' },
  { id: 'mobilita', nome: 'Mobilità' },
]

export const NOME_CATEGORIA = Object.fromEntries(CATEGORIE.map((c) => [c.id, c.nome])) as Record<Categoria, string>
