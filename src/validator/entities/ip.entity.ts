import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Ip {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ip: string;

  @Column()
  fraudScore: number;
}
