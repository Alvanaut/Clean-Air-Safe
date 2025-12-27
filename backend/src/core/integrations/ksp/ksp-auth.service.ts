import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { KspAuthResponse } from './ksp.types';

@Injectable()
export class KspAuthService {
  private readonly logger = new Logger(KspAuthService.name);
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private readonly apiUrl: string;
  private readonly username: string;
  private readonly password: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get('KSP_API_URL') || 'https://api.kheiron-sp.io/v1';
    this.username = this.configService.get('KSP_API_USERNAME') || '';
    this.password = this.configService.get('KSP_API_PASSWORD') || '';

    if (!this.username || !this.password) {
      this.logger.warn('⚠️  KSP credentials not configured in .env');
    }
  }

  /**
   * Get valid access token (refresh if expired)
   */
  async getAccessToken(): Promise<string> {
    if (this.isTokenValid() && this.accessToken) {
      return this.accessToken;
    }

    this.logger.log('Requesting new KSP access token...');
    await this.authenticate();

    if (!this.accessToken) {
      throw new Error('Failed to acquire KSP access token');
    }

    return this.accessToken;
  }

  /**
   * Authenticate with KSP API and get bearer token
   */
  private async authenticate(): Promise<void> {
    try {
      const response = await axios.post<KspAuthResponse>(
        `${this.apiUrl.replace('/v1', '')}/token`,
        new URLSearchParams({
          grant_type: 'password',
          username: this.username,
          password: this.password,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cache-Control': 'no-cache',
          },
        },
      );

      this.accessToken = response.data.access_token;

      // Set expiry with 5 minutes buffer
      const expiresInMs = (response.data.expires_in - 300) * 1000;
      this.tokenExpiry = new Date(Date.now() + expiresInMs);

      this.logger.log(
        `✅ KSP token acquired. Expires at: ${this.tokenExpiry.toISOString()}`,
      );
    } catch (error) {
      this.logger.error('Failed to authenticate with KSP API', error);
      throw new Error('KSP authentication failed');
    }
  }

  /**
   * Check if current token is still valid
   */
  private isTokenValid(): boolean {
    if (!this.accessToken || !this.tokenExpiry) {
      return false;
    }
    return new Date() < this.tokenExpiry;
  }

  /**
   * Force token refresh
   */
  async refreshToken(): Promise<void> {
    this.accessToken = null;
    this.tokenExpiry = null;
    await this.authenticate();
  }

  /**
   * Get authenticated Axios instance
   */
  async getAuthenticatedClient(): Promise<AxiosInstance> {
    const token = await this.getAccessToken();

    return axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
  }
}
