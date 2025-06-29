/**
 * クリップボード操作のユーティリティ関数
 */

export interface CopyOptions {
  showAlert?: boolean;
  alertMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * テキストをクリップボードにコピーする
 * @param text コピーするテキスト
 * @param options コピー時のオプション
 */
export const copyToClipboard = async (
  text: string, 
  options: CopyOptions = {}
): Promise<boolean> => {
  const {
    showAlert = true,
    alertMessage = "Copied!",
    onSuccess,
    onError
  } = options;

  try {
    await navigator.clipboard.writeText(text);
    
    if (showAlert) {
      alert(alertMessage);
    }
    
    if (onSuccess) {
      onSuccess();
    }
    
    console.log(`📋 Copied to clipboard: ${text}`);
    return true;
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown clipboard error');
    console.error("❌ Failed to copy to clipboard:", error);
    
    if (onError) {
      onError(error);
    }
    
    return false;
  }
};

/**
 * React コンポーネント用のクリップボードコピーフック
 */
export const useCopyToClipboard = () => {
  return {
    copyToClipboard
  };
};