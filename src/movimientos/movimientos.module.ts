
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientosService } from './movimientos.service';
import { MovimientosController } from './movimientos.controller';
import { Movimiento } from '../database/entities/movimiento.entity';
import { Producto } from '../database/entities/producto.entity';
import { Usuario } from '../database/entities/usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Movimiento, Producto, Usuario]),
  ],
  controllers: [MovimientosController],
  providers: [MovimientosService],
  exports: [MovimientosService],
})
export class MovimientosModule {}

