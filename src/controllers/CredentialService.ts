import { Service } from 'typedi';
import { CredentialModel } from './CredentialModel';
import { CryptoUtil } from './CryptoUtil';
import { CredentialDTO, CredentialResponse } from './types';
export interface CredentialDTO {
  token: string;
  baseUrl: string;
  proxyUrl: string;
  projectName: string;
}

export interface CredentialResponse {
  token: string;
  baseUrl: string;
  proxyUrl: string;
  projectName: string;
}

@Service()
export class CredentialService {
  async create(payload: CredentialDTO): Promise<CredentialResponse> {
    try {
      const encryptedToken = CryptoUtil.encrypt(payload.token);
      const record = await CredentialModel.create({
        ...payload,
        token: encryptedToken
      });

      return this.sanitize(record);
    } catch (error) {
      throw new Error(`Failed to create credential: ${(error as Error).message}`);
    }
  }

  async get(projectName: string): Promise<CredentialResponse> {
    try {
      const record = await CredentialModel.findOne({ projectName });
      if (!record) throw new Error('Credential not found');

      return this.sanitize(record);
    } catch (error) {
      throw new Error(`Failed to retrieve credential: ${(error as Error).message}`);
    }
  }

  async update(projectName: string, updates: Partial<CredentialDTO>): Promise<CredentialResponse> {
    try {
      const updateData = { ...updates };
      if (updateData.token) {
        updateData.token = CryptoUtil.encrypt(updateData.token);
      }

      const record = await CredentialModel.findOneAndUpdate(
        { projectName },
        updateData,
        { new: true }
      );

      if (!record) throw new Error('Credential not found');

      return this.sanitize(record);
    } catch (error) {
      throw new Error(`Failed to update credential: ${(error as Error).message}`);
    }
  }

  async delete(projectName: string): Promise<boolean> {
    try {
      const result = await CredentialModel.findOneAndDelete({ projectName });
      if (!result) throw new Error('Credential not found');
      return true;
    } catch (error) {
      throw new Error(`Failed to delete credential: ${(error as Error).message}`);
    }
  }

  private sanitize(doc: any): CredentialResponse {
    return {
      token: CryptoUtil.decrypt(doc.token),
      baseUrl: doc.baseUrl,
      proxyUrl: doc.proxyUrl,
      projectName: doc.projectName
    };
  }
}
