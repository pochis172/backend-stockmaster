
import { IsEnum, IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoMovimiento } from '../../database/entities/movimiento.entity';

export class CrearMovimientoDto {
  @IsEnum(TipoMovimiento)
  tipo: TipoMovimiento;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cantidad: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productoId: number;
}
