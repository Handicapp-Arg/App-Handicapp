import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, ValidationPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PedigreeService } from './pedigree.service';
import { CreatePedigreeDto, AdminResolveDto, UploadDocumentDto } from './dto/create-pedigree.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

@ApiTags('pedigree')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller()
export class PedigreeController {
  constructor(private readonly pedigreeService: PedigreeService) {}

  @Get('pedigree/search')
  search(@Query('q') q: string, @GetUser() user: User) {
    return this.pedigreeService.search(q, user);
  }

  @Get('pedigree/admin/stats')
  getAdminStats(@GetUser() user: User) {
    if (user.role !== 'admin') return { total: 0, verified: 0, pending: 0, disputed: 0 };
    return this.pedigreeService.getAdminStats();
  }

  @Get('pedigree/admin/disputed')
  getDisputed(@GetUser() user: User) {
    if (user.role !== 'admin') return [];
    return this.pedigreeService.getDisputedPedigrees();
  }

  @Get('horses/:horseId/pedigree')
  findByHorse(@Param('horseId') horseId: string, @GetUser() user: User) {
    return this.pedigreeService.findByHorse(horseId, user);
  }

  @Post('horses/:horseId/pedigree')
  upsert(
    @Param('horseId') horseId: string,
    @Body(ValidationPipe) dto: CreatePedigreeDto,
    @GetUser() user: User,
  ) {
    return this.pedigreeService.upsert(horseId, dto, user);
  }

  @Post('horses/:horseId/pedigree/validate')
  validate(@Param('horseId') horseId: string, @GetUser() user: User) {
    return this.pedigreeService.triggerValidation(horseId, user);
  }

  @Get('horses/:horseId/pedigree/validations')
  getValidations(@Param('horseId') horseId: string, @GetUser() user: User) {
    return this.pedigreeService.getValidations(horseId, user);
  }

  @Post('horses/:horseId/pedigree/documents')
  addDocument(
    @Param('horseId') horseId: string,
    @Body(ValidationPipe) dto: UploadDocumentDto,
    @GetUser() user: User,
  ) {
    return this.pedigreeService.addDocument(horseId, dto, user);
  }

  @Get('horses/:horseId/pedigree/tree')
  getTree(
    @Param('horseId') horseId: string,
    @Query('depth', new DefaultValuePipe(2), ParseIntPipe) depth: number,
    @GetUser() user: User,
  ) {
    const clampedDepth = Math.min(Math.max(depth, 1), 3);
    return this.pedigreeService.getTree(horseId, clampedDepth, user);
  }

  @Post('horses/:horseId/pedigree/resolve')
  adminResolve(
    @Param('horseId') horseId: string,
    @Body(ValidationPipe) dto: AdminResolveDto,
    @GetUser() user: User,
  ) {
    return this.pedigreeService.adminResolve(horseId, dto, user);
  }
}
