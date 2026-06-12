import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  OneToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from '../products/product.entity';

@Entity('merchant_profiles')
export class MerchantProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'stripe_account_id', type: 'varchar', nullable: true })
  stripeAccountId: string | null;

  @Column({ name: 'shop_name' })
  shopName: string;

  @Column({ name: 'balance_pending', type: 'decimal', precision: 10, scale: 2, default: 0 })
  balancePending: number;

  @Column({ name: 'balance_paid', type: 'decimal', precision: 10, scale: 2, default: 0 })
  balancePaid: number;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'bank_account_name', type: 'varchar', nullable: true })
  bankAccountName: string | null;

  @Column({ name: 'bank_iban_encrypted', type: 'varchar', nullable: true })
  bankIbanEncrypted: string | null;

  @Column({ name: 'bank_bic', type: 'varchar', nullable: true })
  bankBic: string | null;

  @Column({ name: 'bank_name', type: 'varchar', nullable: true })
  bankName: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => User, (user) => user.merchantProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Product, (product) => product.merchant)
  products: Product[];
}
