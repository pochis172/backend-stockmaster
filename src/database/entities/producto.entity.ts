
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Categoria } from './categoria.entity';
import { Movimiento } from './movimiento.entity';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precio: string;

  @Column({ name: 'stock_actual', type: 'int', default: 0 })
  stockActual: number;

  @ManyToOne(() => Categoria, (categoria) => categoria.productos, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'categoria_id' })
  categoria: Relation<Categoria>;

  @OneToMany(() => Movimiento, (movimiento) => movimiento.producto)
  movimientos: Relation<Movimiento[]>;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
