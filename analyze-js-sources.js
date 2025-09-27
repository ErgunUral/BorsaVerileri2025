import axios from 'axios';
import * as cheerio from 'cheerio';

async function analyzeJavaScriptSources() {
    try {
        console.log('İş Yatırım JavaScript kaynaklarını analiz ediliyor...');
        
        const response = await axios.get('https://www.isyatirim.com.tr');
        const $ = cheerio.load(response.data);
        
        // Script etiketlerini bul
        const scripts = $('script');
        console.log(`Toplam ${scripts.length} script etiketi bulundu.`);
        
        // Veri desenleri - basit string arama
        const dataPatterns = [
            'ajax',
            'fetch',
            '$.get',
            '$.post',
            'XMLHttpRequest',
            'api/',
            '/api',
            'data-',
            'json',
            'websocket',
            'socket.io'
        ];
        
        let foundPatterns = [];
        
        scripts.each((index, element) => {
            const scriptContent = $(element).html();
            if (scriptContent) {
                dataPatterns.forEach(pattern => {
                    if (scriptContent.includes(pattern)) {
                        foundPatterns.push({
                            pattern: pattern,
                            scriptIndex: index,
                            preview: scriptContent.substring(0, 100)
                        });
                    }
                });
            }
        });
        
        console.log('Bulunan veri desenleri:', foundPatterns.length);
        foundPatterns.forEach(item => {
            console.log(`- ${item.pattern} (Script ${item.scriptIndex})`);
        });
        
        return foundPatterns;
        
    } catch (error) {
        console.error('Analiz hatası:', error.message);
        return [];
    }
}

// Fonksiyonu çalıştır
analyzeJavaScriptSources().then(results => {
    console.log('Analiz tamamlandı.');
}).catch(error => {
    console.error('Genel hata:', error.message);
});

export { analyzeJavaScriptSources };