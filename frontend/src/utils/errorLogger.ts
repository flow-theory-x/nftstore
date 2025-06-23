// エラーログの統一フォーマット
export class ErrorLogger {
  static logGeneralError(context: string, error: any, additionalInfo?: any) {
    console.group(`❌ ERROR: ${context}`);
    console.error('Error details:', error);
    
    if (error?.message) {
      console.log('Message:', error.message);
    }
    
    if (error?.stack) {
      console.log('Stack trace:', error.stack);
    }
    
    if (additionalInfo) {
      console.log('Additional context:', additionalInfo);
    }
    
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.groupEnd();
  }
  
  static logRetryAttempt(context: string, attempt: number, maxRetries: number, delay: number) {
    console.group(`🔄 RETRY ATTEMPT: ${context}`);
    console.log('📊 Attempt:', attempt, 'of', maxRetries);
    console.log('⏰ Delay:', delay, 'ms');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.groupEnd();
  }
  
  static logSuccess(context: string, additionalInfo?: any) {
    console.group(`✅ SUCCESS: ${context}`);
    if (additionalInfo) {
      console.log('Result:', additionalInfo);
    }
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.groupEnd();
  }
}