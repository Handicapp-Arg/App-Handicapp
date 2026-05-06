import { Controller, Get, Post, Delete, Param, Body, UseGuards, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MedicalService } from './medical.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

@ApiTags('medical')
@ApiBearerAuth()
@Controller('horses/:horseId/medical')
@UseGuards(AuthGuard('jwt'))
export class MedicalController {
  constructor(private readonly medicalService: MedicalService) {}

  @Get()
  findAll(@Param('horseId') horseId: string, @GetUser() user: User) {
    return this.medicalService.findByHorse(horseId, user);
  }

  @Post()
  create(
    @Param('horseId') horseId: string,
    @Body(ValidationPipe) dto: CreateMedicalRecordDto,
    @GetUser() user: User,
  ) {
    return this.medicalService.create(horseId, dto, user);
  }

  @Delete(':recordId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('horseId') horseId: string,
    @Param('recordId') recordId: string,
    @GetUser() user: User,
  ) {
    return this.medicalService.remove(horseId, recordId, user);
  }
}
