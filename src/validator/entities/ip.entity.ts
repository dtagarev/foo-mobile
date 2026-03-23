import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Ip {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ip: string;

  @Column({ default: -1 })
  fraudScore: number;
}
