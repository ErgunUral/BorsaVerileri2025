import React from 'react';
import { User, Lock, CreditCard, Shield } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-amber-500/20">
          <User className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Profil</h1>
          <p className="text-sm text-gray-600 mt-0.5">Hesap ayarlarınızı yönetin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Hesap Bilgileri', desc: 'Ad, soyad, e-posta', icon: User },
          { title: 'Şifre Değiştir', desc: 'Güvenli şifre yönetimi', icon: Lock },
          { title: 'Abonelik', desc: 'Ücretsiz / Premium plan', icon: CreditCard },
          { title: 'Gizlilik', desc: 'Veri ve gizlilik ayarları', icon: Shield },
        ].map(({ title, desc, icon: Icon }) => (
          <div key={title} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="inline-flex p-2.5 bg-amber-50 rounded-xl mb-3">
              <Icon className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm text-amber-900">
        <p className="font-medium mb-1">💡 Kayıtlı kullanıcı özelliği</p>
        <p className="text-amber-800/90">
          Giriş/Üye kaydı sistemi henüz tam olarak entegre edilmemiştir. Auth route ve
          uç noktaları hazır olup, veritabanı entegrasyonu sonrası aktif edilecektir.
        </p>
      </div>
    </div>
  );
}
