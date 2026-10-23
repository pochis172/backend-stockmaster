
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Producto } from './producto.entity';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
  })
  nombre: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  descripcion: string | null;

  @OneToMany(
    () => Producto,
    (producto) => producto.categoria,
  )
  productos: Relation<Producto[]>;
}
