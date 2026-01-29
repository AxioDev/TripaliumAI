import { Controller, Post, Body, Get, Delete, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  SignupDto,
  LoginDto,
  AuthResponseDto,
  UserDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  MessageResponseDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Create a new account' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async signup(@Body() dto: SignupDto): Promise<AuthResponseDto> {
    return this.authService.signup(
      dto.email,
      dto.password,
      dto.consentGiven,
      dto.privacyPolicyVersion,
    );
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, type: UserDto })
  async me(@CurrentUser() user: { id: string; email: string }): Promise<UserDto> {
    return user;
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete account (GDPR Right to Erasure)' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  async deleteAccount(
    @CurrentUser() user: { id: string },
  ): Promise<{ success: boolean }> {
    return this.authService.deleteAccount(user.id);
  }

  @Get('data-export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export user data (GDPR Right to Data Portability)' })
  @ApiResponse({ status: 200, description: 'User data export' })
  async exportData(
    @CurrentUser() user: { id: string },
  ): Promise<Record<string, unknown>> {
    return this.authService.exportData(user.id);
  }
}
