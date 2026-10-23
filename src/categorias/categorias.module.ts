import { Module } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CategoriasController } from './categorias.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Categoria } from '../database/entities/categoria.entity';
import { Producto } from '../database/entities/producto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Categoria, Producto])],
  providers: [CategoriasService],
  controllers: [CategoriasController]
})
export class CategoriasModule {}
