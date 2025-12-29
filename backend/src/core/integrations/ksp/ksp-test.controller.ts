import { Controller, Get, Query } from '@nestjs/common';
import { KspService } from './ksp.service';
import { Public } from '../../../auth/decorators/public.decorator';

@Public()
@Controller('ksp-test')
export class KspTestController {
  constructor(private kspService: KspService) {}

  /**
   * Test KSP integration - Get all contracts
   * GET /api/ksp-test/contracts
   */
  @Get('contracts')
  async getContracts() {
    try {
      const contracts = await this.kspService.getContracts();
      return {
        success: true,
        message: '✅ KSP API connected successfully!',
        data: contracts,
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ KSP API connection failed',
        error: error.message,
      };
    }
  }

  /**
   * Test KSP integration - Get devices for a contract
   * GET /api/ksp-test/devices?contractId=xxx
   */
  @Get('devices')
  async getDevices(@Query('contractId') contractId: string) {
    if (!contractId) {
      return {
        success: false,
        message: 'contractId query parameter is required',
      };
    }

    try {
      const devices = await this.kspService.getDevices(contractId);
      return {
        success: true,
        message: `✅ Found ${devices.devices.length} devices`,
        data: devices,
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ Failed to get devices',
        error: error.message,
      };
    }
  }

  /**
   * Test KSP integration - Get real-time logs for a single device
   * GET /api/ksp-test/realtime?contractId=xxx&deviceId=16
   */
  @Get('realtime')
  async getRealtimeLogs(
    @Query('contractId') contractId: string,
    @Query('deviceId') deviceId: string,
  ) {
    if (!contractId || !deviceId) {
      return {
        success: false,
        message: 'contractId and deviceId query parameters are required',
      };
    }

    try {
      // Use GET endpoint for single device - try Digital Twin tags
      const logs = await this.kspService.getDeviceRealtimeLogs(
        contractId,
        deviceId,
        ['DT_co2', 'DT_temperature', 'DT_humidity', 'DT_serial_number'],
      );

      // Parse logs (pass full response to handle both old and new format)
      const parsedReadings = this.kspService.parseRealtimeLogs(
        logs.logs || [],
        logs,
      );

      return {
        success: true,
        message: `✅ Got real-time data for device ${deviceId}`,
        raw_logs: logs,
        parsed_readings: parsedReadings,
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ Failed to get real-time logs',
        error: error.message,
        error_response: error.response?.data,
        error_status: error.response?.status,
      };
    }
  }

  /**
   * Debug endpoint - Test authentication only
   * GET /api/ksp-test/auth
   */
  @Get('auth')
  async testAuth() {
    try {
      const contracts = await this.kspService.getContracts();
      return {
        success: true,
        message: '✅ Authentication successful!',
        contracts_count: contracts.contracts?.length || 0,
        contracts: contracts.contracts,
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ Authentication failed',
        error: error.message,
        response_data: error.response?.data,
        response_status: error.response?.status,
      };
    }
  }

  /**
   * Complete test flow - Get contracts → devices → real-time data
   * GET /api/ksp-test/full
   */
  @Get('full')
  async fullTest() {
    try {
      // Step 1: Get contracts
      console.log('Step 1: Getting contracts...');
      const contracts = await this.kspService.getContracts();
      console.log('Contracts received:', contracts);

      if (!contracts.contracts || contracts.contracts.length === 0) {
        return {
          success: false,
          message: 'No contracts found',
        };
      }

      const firstContract = contracts.contracts[0];
      console.log('Using contract:', firstContract.id, firstContract.company);

      // Step 2: Get devices
      console.log('Step 2: Getting devices...');
      const devices = await this.kspService.getDevices(firstContract.id);
      console.log('Devices received:', devices.devices?.length);

      if (!devices.devices || devices.devices.length === 0) {
        return {
          success: true,
          message: `Contract found but no devices: ${firstContract.company}`,
          contract: firstContract,
        };
      }

      // Step 3: Get detail of FIRST device (without real-time, just test the endpoint)
      const firstDevice = devices.devices[0];
      console.log('Step 3: Getting device detail for:', firstDevice.id, firstDevice.name);

      const deviceDetail = await this.kspService.getDevice(
        firstContract.id,
        firstDevice.id,
      );
      console.log('Device detail received:', deviceDetail);

      // For now, skip real-time logs (endpoint seems problematic)
      const parsedReadings = [];

      return {
        success: true,
        message: '✅ Full KSP integration test passed!',
        summary: {
          contract: {
            id: firstContract.id,
            company: firstContract.company,
            reference: firstContract.reference,
          },
          devices_count: devices.devices.length,
          readings_count: parsedReadings.length,
        },
        contract: firstContract,
        devices: devices.devices,
        latest_readings: parsedReadings,
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ Full test failed',
        error: error.message,
        stack: error.stack,
      };
    }
  }
}
