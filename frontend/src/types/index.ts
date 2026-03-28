export type DonationBoxStatus = 'active' | 'completed' | 'closed'

export type DonationBox = {
  id: string
  title: string
  description: string
  goalAmount: number   // SUI単位
  currentAmount: number // SUI単位
  creatorAddress: string
  deadline: string     // ISO 8601 date string
  imageUrl?: string
  status: DonationBoxStatus
  category: string
}
