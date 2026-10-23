import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { Producto } from '../database/entities/producto.entity';
import { Categoria } from '../database/entities/categoria.entity';
import { Movimiento } from '../database/entities/movimiento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Producto, Categoria, Movimiento])],
  providers: [ProductosService],
  controllers: [ProductosController],
})
export class ProductosModule {}
