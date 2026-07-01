import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { HorsesService } from './horses.service';
import { CreateHorseDto } from './dto/create-horse.dto';
import { UpdateHorseDto } from './dto/update-horse.dto';
import { UpdateOwnershipDto } from './dto/update-ownership.dto';
import { HorsesQueryDto } from './dto/horses-query.dto';
import { TransferHorseDto } from './dto/transfer-horse.dto';
import { AssignVetDto } from './dto/assign-vet.dto';
import { AssignMemberDto } from './dto/assign-member.dto';
import { CreateWeightRecordDto } from './dto/create-weight-record.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('horses')
@ApiBearerAuth()
@Controller('horses')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class HorsesController {
  constructor(private readonly horsesService: HorsesService) {}

  @Post()
  @RequirePermission('horses', 'create')
  create(
    @Body(ValidationPipe) dto: CreateHorseDto,
    @GetUser() user: User,
  ) {
    return this.horsesService.create(dto, user);
  }

  @Get()
  @RequirePermission('horses', 'read')
  findAll(
    @GetUser() user: User,
    @Query(new ValidationPipe({ transform: true })) query: HorsesQueryDto,
  ) {
    return this.horsesService.findAll(user, query);
  }

  @Post(':id/transfer')
  @RequirePermission('horses', 'update')
  transfer(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: TransferHorseDto,
    @GetUser() user: User,
  ) {
    return this.horsesService.transfer(id, dto, user);
  }

  @Get(':id/expenses/export')
  @RequirePermission('horses', 'read')
  async exportExpenses(
    @Param('id') id: string,
    @GetUser() user: User,
    @Res() res: Response,
  ) {
    const csv = await this.horsesService.exportExpenses(id, user);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="gastos-${id}.csv"`);
    res.send('﻿' + csv);
  }

  @Get(':id/financial-summary')
  @RequirePermission('horses', 'read')
  getFinancialSummary(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.getFinancialSummary(id, user);
  }

  @Get(':id/weight')
  @RequirePermission('horses', 'read')
  getWeightRecords(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.getWeightRecords(id, user);
  }

  @Post(':id/weight')
  @RequirePermission('horses', 'update')
  addWeightRecord(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: CreateWeightRecordDto,
    @GetUser() user: User,
  ) {
    return this.horsesService.addWeightRecord(id, dto, user);
  }

  @Delete(':id/weight/:recordId')
  @RequirePermission('horses', 'update')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteWeightRecord(
    @Param('id') id: string,
    @Param('recordId') recordId: string,
    @GetUser() user: User,
  ) {
    return this.horsesService.deleteWeightRecord(id, recordId, user);
  }

  @Post(':id/share')
  @RequirePermission('horses', 'read')
  createShareToken(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.createShareToken(id, user);
  }

  @Get(':id/documents')
  @RequirePermission('horses', 'read')
  getDocuments(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.getDocuments(id, user);
  }

  @Post(':id/documents')
  @RequirePermission('horses', 'update')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
    @GetUser() user: User,
  ) {
    return this.horsesService.uploadDocument(id, file, name, user);
  }

  @Delete(':id/documents/:docId')
  @RequirePermission('horses', 'update')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @GetUser() user: User,
  ) {
    return this.horsesService.deleteDocument(id, docId, user);
  }

  @Get(':id/vets')
  @RequirePermission('horses', 'read')
  getVets(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.getVets(id, user);
  }

  @Post(':id/vets')
  @RequirePermission('horses', 'update')
  assignVet(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: AssignVetDto,
    @GetUser() user: User,
  ) {
    return this.horsesService.assignVet(id, dto, user);
  }

  @Delete(':id/vets/:vetUserId')
  @RequirePermission('horses', 'update')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeVet(
    @Param('id') id: string,
    @Param('vetUserId') vetUserId: string,
    @GetUser() user: User,
  ) {
    return this.horsesService.removeVet(id, vetUserId, user);
  }

  // ── Asignación de equipo (miembros de la organización) ──

  @Get(':id/assignees')
  @RequirePermission('horses', 'read')
  getAssignees(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.getAssignees(id, user);
  }

  @Get(':id/org-members')
  @RequirePermission('horses', 'read')
  getOrgMembers(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.getOrgMembers(id, user);
  }

  @Post(':id/assignees')
  @RequirePermission('horses', 'update')
  assignMember(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: AssignMemberDto,
    @GetUser() user: User,
  ) {
    return this.horsesService.assignMember(id, dto, user);
  }

  @Delete(':id/assignees/:userId')
  @RequirePermission('horses', 'update')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @GetUser() user: User,
  ) {
    return this.horsesService.removeMember(id, userId, user);
  }

  @Get(':id/ownership')
  @RequirePermission('horses', 'read')
  getOwnership(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.getOwnership(id, user);
  }

  @Put(':id/ownership')
  @RequirePermission('horses', 'update')
  updateOwnership(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateOwnershipDto,
    @GetUser() user: User,
  ) {
    return this.horsesService.updateOwnership(id, dto, user);
  }

  @Post(':id/image')
  @RequirePermission('horses', 'update')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 15 * 1024 * 1024 } }))
  uploadImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/i })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
    @GetUser() user: User,
  ) {
    return this.horsesService.uploadImage(id, file, user);
  }

  @Delete(':id/image')
  @RequirePermission('horses', 'update')
  removeImage(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.removeImage(id, user);
  }

  @Get(':id')
  @RequirePermission('horses', 'read')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.findOne(id, user);
  }

  @Get(':id/movements')
  @RequirePermission('horses', 'read')
  getMovements(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.getMovements(id, user);
  }

  @Patch(':id')
  @RequirePermission('horses', 'update')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateHorseDto,
    @GetUser() user: User,
  ) {
    return this.horsesService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermission('horses', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.remove(id, user);
  }
}
