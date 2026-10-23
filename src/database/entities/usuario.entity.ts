
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Rol } from './rol.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 100,
  })
  nombre: string;

  @Column({
    type: 'varchar',
    length: 150,
    unique: true,
  })
  correo: string;

  @Column({
    type: 'varchar',
    length: 255,
    select: false,
  })
  password: string;

  @ManyToOne(() => Rol, (rol) => rol.usuarios, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'rol_id' })
  rol: Relation<Rol>;

  @CreateDateColumn()
  fechaCreacion: Date;
}
