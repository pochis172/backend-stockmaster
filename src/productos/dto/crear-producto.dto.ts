
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
  MinLength,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CrearProductoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  precio: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoriaId: number;
}
