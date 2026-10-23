
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { MovimientosService } from './movimientos.service';
import { CrearMovimientoDto } from './dto/crear-movimiento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

interface AuthenticatedRequest extends Request {
  user: { id: number; correo: string; rol: { nombre: string } };
}

@ApiTags('Movimientos')
@ApiBearerAuth()
@Controller('movimientos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovimientosController {
  constructor(private readonly service: MovimientosService) {}

  @Post()
  @Roles('BODEGUERO')
  create(
    @Body() dto: CrearMovimientoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('producto/:productoId')
  findByProduct(
    @Param('productoId', ParseIntPipe) productoId: number,
  ) {
    return this.service.findByProduct(productoId);
  }
}
