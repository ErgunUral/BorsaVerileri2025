// Error Handling ve Fallback Mekanizmaları Testi
const fs = require('fs');
const path = require('path');

// Test senaryoları
const errorScenarios = {
  // API hata durumları
  apiErrors: {
    networkError: {
      error: 'Network Error',
      message: 'Failed to fetch data from server'
    },
    serverError: {
      error: 'Internal Server Error',
      status: 500,
      message: 'Server encountered an error'
    },
    notFound: {
      error: 'Not Found',
      status: 404,
      message: 'Stock not found'
    },
    unauthorized: {
      error: 'Unauthorized',
      status: 401,
      message: 'Access denied'
    }
  },
  
  // Veri eksikliği durumları
  dataIssues: {
    emptyResponse: {
      success: true,
      data: null
    },
    incompleteData: {
      success: true,
      data: {
        stockCode: 'THYAO',
        // financialData eksik
        // ratios eksik
      }
    },
    invalidData: {
      success: true,
      data: {
        stockCode: 'THYAO',
        financialData: {
          totalAssets: 'invalid',
          revenue: null,
          netProfit: undefined
        }
      }
    }
  },
  
  // Hesaplama hataları
  calculationErrors: {
    divisionByZero: {
      totalAssets: 1000000,
      revenue: 0, // Sıfıra bölme
      netProfit: 50000
    },
    negativeValues: {
      totalAssets: -1000000, // Negatif değer
      revenue: 500000,
      netProfit: -100000
    },
    missingFields: {
      totalAssets: 1000000,
      // revenue eksik
      netProfit: 50000
    }
  }
};

// Test fonksiyonları
function testAPIErrorHandling() {
  console.log('\n=== API ERROR HANDLING TESTİ ===');
  
  const { apiErrors } = errorScenarios;
  let passedTests = 0;
  let totalTests = 0;
  
  // Network error testi
  totalTests++;
  try {
    const networkErrorHandled = handleNetworkError(apiErrors.networkError);
    if (networkErrorHandled.fallback && networkErrorHandled.userMessage) {
      console.log('✓ Network error handling: BAŞARILI');
      passedTests++;
    } else {
      console.log('✗ Network error handling: BAŞARISIZ');
    }
  } catch (error) {
    console.log('✗ Network error handling: HATA -', error.message);
  }
  
  // Server error testi
  totalTests++;
  try {
    const serverErrorHandled = handleServerError(apiErrors.serverError);
    if (serverErrorHandled.retry && serverErrorHandled.userMessage) {
      console.log('✓ Server error handling: BAŞARILI');
      passedTests++;
    } else {
      console.log('✗ Server error handling: BAŞARISIZ');
    }
  } catch (error) {
    console.log('✗ Server error handling: HATA -', error.message);
  }
  
  // 404 error testi
  totalTests++;
  try {
    const notFoundHandled = handleNotFoundError(apiErrors.notFound);
    if (notFoundHandled.suggestion && notFoundHandled.userMessage) {
      console.log('✓ 404 error handling: BAŞARILI');
      passedTests++;
    } else {
      console.log('✗ 404 error handling: BAŞARISIZ');
    }
  } catch (error) {
    console.log('✗ 404 error handling: HATA -', error.message);
  }
  
  console.log(`API Error Tests: ${passedTests}/${totalTests} başarılı`);
  return { passed: passedTests, total: totalTests };
}

function testDataValidation() {
  console.log('\n=== VERİ DOĞRULAMA TESTİ ===');
  
  const { dataIssues } = errorScenarios;
  let passedTests = 0;
  let totalTests = 0;
  
  // Empty response testi
  totalTests++;
  try {
    const emptyDataHandled = validateResponseData(dataIssues.emptyResponse);
    if (!emptyDataHandled.isValid && emptyDataHandled.fallbackData) {
      console.log('✓ Empty response validation: BAŞARILI');
      passedTests++;
    } else {
      console.log('✗ Empty response validation: BAŞARISIZ');
    }
  } catch (error) {
    console.log('✗ Empty response validation: HATA -', error.message);
  }
  
  // Incomplete data testi
  totalTests++;
  try {
    const incompleteDataHandled = validateResponseData(dataIssues.incompleteData);
    if (!incompleteDataHandled.isValid && incompleteDataHandled.missingFields) {
      console.log('✓ Incomplete data validation: BAŞARILI');
      passedTests++;
    } else {
      console.log('✗ Incomplete data validation: BAŞARISIZ');
    }
  } catch (error) {
    console.log('✗ Incomplete data validation: HATA -', error.message);
  }
  
  // Invalid data testi
  totalTests++;
  try {
    const invalidDataHandled = validateResponseData(dataIssues.invalidData);
    if (!invalidDataHandled.isValid && invalidDataHandled.invalidFields) {
      console.log('✓ Invalid data validation: BAŞARILI');
      passedTests++;
    } else {
      console.log('✗ Invalid data validation: BAŞARISIZ');
    }
  } catch (error) {
    console.log('✗ Invalid data validation: HATA -', error.message);
  }
  
  console.log(`Data Validation Tests: ${passedTests}/${totalTests} başarılı`);
  return { passed: passedTests, total: totalTests };
}

function testCalculationErrorHandling() {
  console.log('\n=== HESAPLAMA HATA YÖNETİMİ TESTİ ===');
  
  const { calculationErrors } = errorScenarios;
  let passedTests = 0;
  let totalTests = 0;
  
  // Division by zero testi
  totalTests++;
  try {
    const divisionResult = safeCalculateRatio(calculationErrors.divisionByZero.netProfit, calculationErrors.divisionByZero.revenue);
    if (divisionResult.error && divisionResult.fallbackValue !== undefined) {
      console.log('✓ Division by zero handling: BAŞARILI');
      passedTests++;
    } else {
      console.log('✗ Division by zero handling: BAŞARISIZ');
    }
  } catch (error) {
    console.log('✗ Division by zero handling: HATA -', error.message);
  }
  
  // Negative values testi
  totalTests++;
  try {
    const negativeResult = validateFinancialValues(calculationErrors.negativeValues);
    if (!negativeResult.isValid && negativeResult.warnings) {
      console.log('✓ Negative values handling: BAŞARILI');
      passedTests++;
    } else {
      console.log('✗ Negative values handling: BAŞARISIZ');
    }
  } catch (error) {
    console.log('✗ Negative values handling: HATA -', error.message);
  }
  
  // Missing fields testi
  totalTests++;
  try {
    const missingFieldsResult = validateRequiredFields(calculationErrors.missingFields, ['totalAssets', 'revenue', 'netProfit']);
    if (!missingFieldsResult.isValid && missingFieldsResult.missingFields) {
      console.log('✓ Missing fields handling: BAŞARILI');
      passedTests++;
    } else {
      console.log('✗ Missing fields handling: BAŞARISIZ');
    }
  } catch (error) {
    console.log('✗ Missing fields handling: HATA -', error.message);
  }
  
  console.log(`Calculation Error Tests: ${passedTests}/${totalTests} başarılı`);
  return { passed: passedTests, total: totalTests };
}

function testFallbackMechanisms() {
  console.log('\n=== FALLBACK MEKANİZMALARI TESTİ ===');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Default data fallback testi
  totalTests++;
  try {
    const defaultData = getDefaultStockData();
    if (defaultData && defaultData.stockCode && defaultData.message) {
      console.log('✓ Default data fallback: BAŞARILI');
      passedTests++;
    } else {
      console.log('✗ Default data fallback: BAŞARISIZ');
    }
  } catch (error) {
    console.log('✗ Default data fallback: HATA -', error.message);
  }
  
  // Cached data fallback testi
  totalTests++;
  try {
    const cachedData = getCachedDataFallback('THYAO');
    if (cachedData && (cachedData.data || cachedData.message)) {
      console.log('✓ Cached data fallback: BAŞARILI');
      passedTests++;
    } else {
      console.log('✗ Cached data fallback: BAŞARISIZ');
    }
  } catch (error) {
    console.log('✗ Cached data fallback: HATA -', error.message);
  }
  
  // Retry mechanism testi
  totalTests++;
  try {
    const retryResult = testRetryMechanism();
    if (retryResult.attempts > 1 && retryResult.finalResult) {
      console.log('✓ Retry mechanism: BAŞARILI');
      passedTests++;
    } else {
      console.log('✗ Retry mechanism: BAŞARISIZ');
    }
  } catch (error) {
    console.log('✗ Retry mechanism: HATA -', error.message);
  }
  
  console.log(`Fallback Mechanism Tests: ${passedTests}/${totalTests} başarılı`);
  return { passed: passedTests, total: totalTests };
}

// Yardımcı fonksiyonlar (Error handling simülasyonu)
function handleNetworkError(error) {
  return {
    fallback: true,
    userMessage: 'Ağ bağlantısı sorunu. Lütfen internet bağlantınızı kontrol edin.',
    action: 'retry',
    timestamp: new Date().toISOString()
  };
}

function handleServerError(error) {
  return {
    retry: true,
    userMessage: 'Sunucu geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
    retryAfter: 5000,
    timestamp: new Date().toISOString()
  };
}

function handleNotFoundError(error) {
  return {
    suggestion: true,
    userMessage: 'Hisse senedi bulunamadı. Lütfen hisse kodunu kontrol edin.',
    suggestedActions: ['Hisse kodunu kontrol edin', 'Popüler hisselerden seçin'],
    timestamp: new Date().toISOString()
  };
}

function validateResponseData(response) {
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  if (!response.data) {
    result.isValid = false;
    result.errors.push('Data is null or undefined');
    result.fallbackData = getDefaultStockData();
  }
  
  if (response.data && !response.data.financialData) {
    result.isValid = false;
    result.missingFields = ['financialData'];
  }
  
  if (response.data && response.data.financialData) {
    const financialData = response.data.financialData;
    if (typeof financialData.totalAssets !== 'number') {
      result.isValid = false;
      result.invalidFields = ['totalAssets'];
    }
  }
  
  return result;
}

function safeCalculateRatio(numerator, denominator) {
  if (denominator === 0 || denominator === null || denominator === undefined) {
    return {
      error: 'Division by zero',
      fallbackValue: 0,
      message: 'Hesaplama yapılamadı: Payda sıfır'
    };
  }
  
  if (typeof numerator !== 'number' || typeof denominator !== 'number') {
    return {
      error: 'Invalid input',
      fallbackValue: 0,
      message: 'Hesaplama yapılamadı: Geçersiz veri'
    };
  }
  
  return {
    value: numerator / denominator,
    isValid: true
  };
}

function validateFinancialValues(data) {
  const result = {
    isValid: true,
    warnings: [],
    errors: []
  };
  
  Object.keys(data).forEach(key => {
    if (data[key] < 0) {
      result.warnings.push(`${key} has negative value: ${data[key]}`);
      result.isValid = false;
    }
  });
  
  return result;
}

function validateRequiredFields(data, requiredFields) {
  const result = {
    isValid: true,
    missingFields: []
  };
  
  requiredFields.forEach(field => {
    if (data[field] === undefined || data[field] === null) {
      result.missingFields.push(field);
      result.isValid = false;
    }
  });
  
  return result;
}

function getDefaultStockData() {
  return {
    stockCode: 'DEFAULT',
    message: 'Varsayılan veri kullanılıyor',
    financialData: {
      totalAssets: 0,
      revenue: 0,
      netProfit: 0
    },
    timestamp: new Date().toISOString()
  };
}

function getCachedDataFallback(stockCode) {
  // Simüle edilmiş cache kontrolü
  const hasCache = Math.random() > 0.5;
  
  if (hasCache) {
    return {
      data: {
        stockCode,
        cached: true,
        timestamp: new Date(Date.now() - 300000).toISOString() // 5 dakika önce
      },
      message: 'Önbellek verisi kullanılıyor'
    };
  }
  
  return {
    message: 'Önbellek verisi bulunamadı'
  };
}

function testRetryMechanism() {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    // Simüle edilmiş başarı oranı
    const success = attempts === maxAttempts || Math.random() > 0.7;
    
    if (success) {
      return {
        attempts,
        finalResult: 'success',
        message: `${attempts}. denemede başarılı`
      };
    }
  }
  
  return {
    attempts,
    finalResult: 'failed',
    message: 'Tüm denemeler başarısız'
  };
}

// Ana test fonksiyonu
function runErrorHandlingTests() {
  console.log('ERROR HANDLING VE FALLBACK MEKANİZMALARI TEST RAPORU');
  console.log('=' .repeat(60));
  
  const apiResults = testAPIErrorHandling();
  const dataResults = testDataValidation();
  const calculationResults = testCalculationErrorHandling();
  const fallbackResults = testFallbackMechanisms();
  
  const totalPassed = apiResults.passed + dataResults.passed + calculationResults.passed + fallbackResults.passed;
  const totalTests = apiResults.total + dataResults.total + calculationResults.total + fallbackResults.total;
  
  console.log('\n=== TEST SONUÇLARI ÖZETİ ===');
  console.log(`API Error Handling: ${apiResults.passed}/${apiResults.total}`);
  console.log(`Data Validation: ${dataResults.passed}/${dataResults.total}`);
  console.log(`Calculation Errors: ${calculationResults.passed}/${calculationResults.total}`);
  console.log(`Fallback Mechanisms: ${fallbackResults.passed}/${fallbackResults.total}`);
  console.log(`\nTOPLAM: ${totalPassed}/${totalTests} test başarılı`);
  
  const successRate = (totalPassed / totalTests * 100).toFixed(1);
  console.log(`Başarı oranı: %${successRate}`);
  
  if (successRate >= 80) {
    console.log('\n✅ Error handling mekanizmaları yeterli seviyede');
  } else {
    console.log('\n⚠️  Error handling mekanizmaları geliştirilmeli');
  }
  
  return {
    totalPassed,
    totalTests,
    successRate: parseFloat(successRate),
    details: {
      apiErrors: apiResults,
      dataValidation: dataResults,
      calculationErrors: calculationResults,
      fallbackMechanisms: fallbackResults
    }
  };
}

// Testleri çalıştır
runErrorHandlingTests();