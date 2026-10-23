
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Producto } from './producto.entity';
import { Usuario } from './usuario.entity';

export enum TipoMovimiento {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
}

@Entity('movimientos')
export class Movimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: TipoMovimiento,
  })
  tipo: TipoMovimiento;

  @Column({ type: 'int' })
  cantidad: number;

  @CreateDateColumn()
  fecha: Date;

  @ManyToOne(() => Producto, (producto) => producto.movimientos, {
    nullable: false,
  })
  @JoinColumn({ name: 'producto_id' })
  producto: Relation<Producto>;

  @ManyToOne(() => Usuario, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Relation<Usuario>;
}
