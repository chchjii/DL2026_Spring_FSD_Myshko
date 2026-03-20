import { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { Download, Save, Trash2, QrCode } from 'lucide-react';

// Тип для истории QR-кодов
interface QRCodeItem {
  id: number;
  content: string;
  fgColor: string;
  bgColor: string;
  createdAt: string;
}

const API_URL = 'http://localhost:3001/api/qrcodes';

export default function App() {
  // Состояния для настроек QR-кода
  const [content, setContent] = useState('https://github.com');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [size, setSize] = useState(200);

  // Состояние истории и сессии
  const [history, setHistory] = useState<QRCodeItem[]>([]);
  const qrRef = useRef<HTMLDivElement>(null);

  // Получаем или создаем Session ID при первой загрузке
  const getSessionId = () => {
    let sid = localStorage.getItem('session_id');
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem('session_id', sid);
    }
    return sid;
  };

  const sessionId = getSessionId();

  // Загрузка истории с бэкенда
  const fetchHistory = async () => {
    try {
      const res = await fetch(API_URL, {
        headers: { 'X-Session-ID': sessionId }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Сохранение QR-кода в историю на бэкенд
  const handleSaveToHistory = async () => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({ type: 'url', content, fgColor, bgColor })
      });
      if (res.ok) fetchHistory(); // Обновляем список после сохранения
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    }
  };

  // Удаление из истории
  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'X-Session-ID': sessionId }
      });
      if (res.ok) fetchHistory();
    } catch (error) {
      console.error('Ошибка удаления:', error);
    }
  };

  // Скачивание QR-кода в PNG
  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = 'qrcode.png';
      link.click();
    }
  };

  return (
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-gray-800">

        {/* ЛЕВАЯ ПАНЕЛЬ: Настройки (Форма) */}
        <div className="w-full md:w-1/3 p-8 bg-white shadow-xl z-10">
          <div className="flex items-center gap-2 mb-8">
            <QrCode className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold">QR Генератор</h1>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Ссылка или Текст</label>
              <textarea
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Введите текст..."
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Цвет кода</label>
                <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-full h-10 cursor-pointer border-0 p-0"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Цвет фона</label>
                <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-full h-10 cursor-pointer border-0 p-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Размер: {size}px</label>
              <input
                  type="range" min="100" max="400" step="10"
                  value={size} onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full"
              />
            </div>
          </div>
        </div>

        {/* ЦЕНТР: Превью и действия */}
        <div className="w-full md:w-1/3 flex flex-col items-center justify-center p-8 bg-gray-50">
          <div
              className="p-4 bg-white rounded-2xl shadow-lg mb-8 transition-transform hover:scale-105"
              ref={qrRef}
          >
            {/* Сам компонент генерации QR */}
            <QRCodeCanvas
                value={content || ' '}
                size={size}
                bgColor={bgColor}
                fgColor={fgColor}
                level="H"
            />
          </div>

          <div className="flex gap-4 w-full max-w-xs">
            <button
                onClick={handleDownload}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition font-medium shadow-md"
            >
              <Download size={20} /> Скачать
            </button>
            <button
                onClick={handleSaveToHistory}
                className="flex-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition font-medium shadow-sm"
            >
              <Save size={20} /> В архив
            </button>
          </div>
        </div>

        {/* ПРАВАЯ ПАНЕЛЬ: История (связь с бэкендом) */}
        <div className="w-full md:w-1/3 p-8 bg-white border-l border-gray-200 overflow-y-auto max-h-screen">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            История
            <span className="text-sm font-normal bg-gray-100 px-2 py-1 rounded-full text-gray-500">
            {history.length}
          </span>
          </h2>

          {history.length === 0 ? (
              <p className="text-gray-400 text-center mt-10">Вы еще не сохраняли QR-коды.</p>
          ) : (
              <div className="space-y-4">
                {history.map((item) => (
                    <div key={item.id} className="p-4 border border-gray-100 bg-gray-50 rounded-xl flex items-center gap-4 hover:shadow-md transition">
                      <div className="w-16 h-16 shrink-0 bg-white p-1 rounded shadow-sm">
                        <QRCodeCanvas value={item.content} size={56} fgColor={item.fgColor} bgColor={item.bgColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={item.content}>{item.content}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition"
                          title="Удалить"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                ))}
              </div>
          )}
        </div>

      </div>
  );
}