import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Phone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  phone: string;

  @Column()
  fraudScore: number;
}
