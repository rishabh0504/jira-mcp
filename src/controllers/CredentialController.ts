import {
  JsonController,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  OnUndefined,
  HttpError
} from 'routing-controllers';
import { Inject } from 'typedi';
import { CredentialService } from './CredentialService';
import { CredentialDTO, CredentialResponse } from './types';

@JsonController('/credentials')
export class CredentialController {
  @Inject()
  private readonly service!: CredentialService;

  @Post()
  async create(@Body() body: CredentialDTO): Promise<CredentialResponse> {
    try {
      return await this.service.create(body);
    } catch (error) {
      throw new HttpError(400, (error as Error).message);
    }
  }

  @Get('/:projectName')
  async get(@Param('projectName') projectName: string): Promise<CredentialResponse> {
    try {
      return await this.service.get(projectName);
    } catch (error) {
      throw new HttpError(404, (error as Error).message);
    }
  }

  @Put('/:projectName')
  async update(
    @Param('projectName') projectName: string,
    @Body() updates: Partial<CredentialDTO>
  ): Promise<CredentialResponse> {
    try {
      return await this.service.update(projectName, updates);
    } catch (error) {
      throw new HttpError(400, (error as Error).message);
    }
  }

  @Delete('/:projectName')
  @OnUndefined(204)
  async delete(@Param('projectName') projectName: string): Promise<void> {
    try {
      await this.service.delete(projectName);
    } catch (error) {
      throw new HttpError(404, (error as Error).message);
    }
  }
}
