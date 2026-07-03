import { Controller, Get, Post, Delete, Param, Body, UseGuards, ValidationPipe, HttpCode, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

@ApiTags('contracts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  create(@Body(ValidationPipe) dto: CreateContractDto, @GetUser() user: User) {
    return this.contractsService.create(dto, user);
  }

  @Get()
  findMine(@GetUser() user: User) {
    return this.contractsService.findMine(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.contractsService.findOne(id, user);
  }

  @Post(':id/sign')
  @UseInterceptors(
    FileInterceptor('signature', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        cb(null, /^image\/(png|jpeg|webp)$/.test(file.mimetype)),
    }),
  )
  sign(
    @Param('id') id: string,
    @Body('signed_name') signedName: string,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: User,
  ) {
    return this.contractsService.sign(id, signedName, file, user);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @GetUser() user: User,
  ) {
    return this.contractsService.reject(id, reason, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.contractsService.remove(id, user);
  }
}
