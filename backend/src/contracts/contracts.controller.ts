import { Controller, Get, Post, Delete, Param, Body, UseGuards, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
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
  sign(
    @Param('id') id: string,
    @Body('signed_name') signedName: string,
    @GetUser() user: User,
  ) {
    return this.contractsService.sign(id, signedName, user);
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
