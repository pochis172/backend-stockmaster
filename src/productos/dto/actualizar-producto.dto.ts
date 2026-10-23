
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

export class ActualizarProductoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  precio?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoriaId?: number;
}
