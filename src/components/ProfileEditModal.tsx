import { useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { X, Camera, Save, PenSquare, Check, Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Cropper from 'react-easy-crop';

export default function ProfileEditModal({ isOpen, onClose, userData, appId, onSaveSuccess, showAlert, showToast }: any) {
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nickname: userData?.nickname || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    cep: userData?.cep || '',
    address: userData?.address || '',
    addressNumber: userData?.addressNumber || '',
    weight: userData?.weight || '',
    height: userData?.height || '',
    password: '',
    confirmPassword: ''
  });
  const [photoBase64, setPhotoBase64] = useState<string | null>(userData?.photoBase64 || null);
  
  // Cropper state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);

  if (!userData) return null;

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to match the desired output size (e.g., 800x800)
    canvas.width = 800;
    canvas.height = 800;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      800,
      800
    );

    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
        setIsCropping(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = async () => {
    if (imageSrc && croppedAreaPixels) {
      try {
        const croppedImageBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
        setPhotoBase64(croppedImageBase64);
        setIsCropping(false);
        setImageSrc(null);
      } catch (e) {
        console.error(e);
        showAlert("Erro", "Não foi possível cortar a imagem.", "error");
      }
    }
  };

  const handleSave = async () => {
    if (formData.weight && (Number(formData.weight) < 10 || Number(formData.weight) > 300)) {
      showAlert("Atenção", "Por favor, insira um peso válido (entre 10kg e 300kg).", "error");
      return;
    }
    if (formData.height && (Number(formData.height) < 50 || Number(formData.height) > 300)) {
      showAlert("Atenção", "Por favor, insira uma altura válida em centímetros (entre 50cm e 300cm).", "error");
      return;
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      showAlert("Atenção", "As senhas não coincidem. Por favor, confirme a senha corretamente.", "error");
      return;
    }

    setLoading(true);
    try {
      const updates: any = {
        nickname: formData.nickname,
        email: formData.email,
        phone: formData.phone,
        cep: formData.cep,
        address: formData.address,
        addressNumber: formData.addressNumber,
        weight: formData.weight,
        height: formData.height,
      };
      if (formData.password && formData.password.trim() !== '') {
        updates.studentPassword = formData.password;
      }
      if (photoBase64) {
        updates.photoBase64 = photoBase64;
      }

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', userData.id), updates);
      
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setLoading(false);
        if (showToast) {
          showToast("Perfil atualizado com sucesso!", "success");
        } else {
          showAlert("Sucesso", "Perfil atualizado com sucesso!", "success");
        }
        onSaveSuccess();
        onClose();
      }, 1500);
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Erro ao atualizar perfil.", "error");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border-t-4 border-brand-red flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-600">
              <h3 id="modal-title" className="text-gray-800 dark:text-white font-display font-bold text-lg flex items-center">
                <PenSquare className="text-brand-red mr-2 w-5 h-5" aria-hidden="true" /> Alterar Dados
              </h3>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={onClose} 
                className="text-gray-400 hover:text-red-500 transition p-1 no-print"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </motion.button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col items-center mb-6">
                {isCropping ? (
                  <div className="w-full flex flex-col items-center">
                    <div className="relative w-full h-64 bg-gray-900 rounded-xl overflow-hidden mb-4">
                      <Cropper
                        image={imageSrc || undefined}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                      />
                    </div>
                    <div className="w-full px-4 mb-4">
                      <label id="zoom-label" className="text-xs text-gray-500 font-bold mb-1 block">Zoom da Imagem</label>
                      <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="zoom-label"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full accent-brand-red"
                      />
                    </div>
                    <div className="flex gap-2">
                      <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setIsCropping(false); setImageSrc(null); }} 
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300"
                        aria-label="Cancelar corte"
                      >
                        Cancelar
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCropConfirm} 
                        className="px-4 py-2 bg-brand-red text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-md"
                        aria-label="Confirmar corte da foto"
                      >
                        <Check className="w-4 h-4" aria-hidden="true" /> Confirmar Corte
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 dark:border-gray-700 bg-gray-200 dark:bg-gray-600 flex-shrink-0 mb-3 group shadow-inner">
                      {photoBase64 ? (
                        <img src={photoBase64} alt={`Foto de perfil de ${userData.name}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Camera className="w-8 h-8" aria-hidden="true" />
                        </div>
                      )}
                      <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity" aria-label="Alterar foto de perfil">
                        <Camera className="w-6 h-6 text-white" aria-hidden="true" />
                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" aria-hidden="true" />
                      </label>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center font-medium">Clique na imagem para alterar<br/>(Melhor formato: Quadrado)</p>
                    
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800 text-[10px] leading-relaxed">
                      <h4 className="font-bold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1 uppercase tracking-wider">
                        <Loader2 className="w-3 h-3 animate-none" /> Diretrizes de Foto
                      </h4>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                        <li>✅ <span className="font-bold">Recomendado:</span> Rosto nítido, fundo neutro, boa iluminação, resolução mínima de 400px.</li>
                        <li>❌ <span className="font-bold">Proibido:</span> Sem camisa, óculos escuros/máscaras, fotos em grupo, conteúdo ofensivo, fotos embaçadas.</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>

              {!isCropping && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="login" className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Utilizador (Login)</label>
                      <input id="login" type="text" value={userData.studentLogin || ''} className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed" disabled />
                    </div>
                    <div>
                      <label htmlFor="nickname" className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Apelido (Nome Social)</label>
                      <input id="nickname" type="text" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-1 focus:ring-brand-red focus:outline-none" placeholder="Ex: Zé" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4">
                      <label htmlFor="cep" className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">CEP</label>
                      <input id="cep" type="text" value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})} className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-1 focus:ring-brand-red focus:outline-none" placeholder="00000-000" />
                    </div>
                    <div className="sm:col-span-8">
                      <label htmlFor="address" className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Endereço</label>
                      <input id="address" type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-1 focus:ring-brand-red focus:outline-none" placeholder="Rua, Avenida..." />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
                    <div className="col-span-1 sm:col-span-4">
                      <label htmlFor="number" className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Número</label>
                      <input id="number" type="text" value={formData.addressNumber} onChange={e => setFormData({...formData, addressNumber: e.target.value})} className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-1 focus:ring-brand-red focus:outline-none" placeholder="Nº" />
                    </div>
                    <div className="col-span-1 sm:col-span-4">
                      <label htmlFor="weight" className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Peso (kg)</label>
                      <input 
                        id="weight"
                        type="number" 
                        step="0.1" 
                        min="10"
                        max="300"
                        value={formData.weight} 
                        onChange={e => setFormData({...formData, weight: e.target.value})} 
                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-1 focus:ring-brand-red focus:outline-none" 
                        placeholder="Ex: 75.5" 
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <label htmlFor="height" className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Altura (cm)</label>
                      <input 
                        id="height"
                        type="number" 
                        step="1" 
                        min="50"
                        max="300"
                        value={formData.height} 
                        onChange={e => {
                          const val = e.target.value.replace(/[,.]/g, '');
                          setFormData({...formData, height: val});
                        }} 
                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-1 focus:ring-brand-red focus:outline-none" 
                        placeholder="Ex: 175" 
                      />
                    </div>
                  </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">E-mail</label>
                    <input id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-1 focus:ring-brand-red focus:outline-none" />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Telefone</label>
                    <input id="phone" type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-1 focus:ring-brand-red focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-700 mt-2">
                  <div>
                    <label htmlFor="pass" className="block text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Nova Senha (Opcional)</label>
                    <input id="pass" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-blue-200 dark:border-blue-800 rounded p-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="Nova senha..." />
                  </div>
                  <div>
                    <label htmlFor="confirm" className="block text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Confirmar Senha</label>
                    <input id="confirm" type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full border border-blue-200 dark:border-blue-800 rounded p-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="Confirme a senha..." />
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-gray-400 italic">Deixe em branco para manter a senha atual.</p>
                  </div>
                </div>
              </div>
              )}
              
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-700 no-print">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose} 
                  className="px-5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-gray-700 dark:text-gray-300 transition"
                  aria-label="Descartar alterações"
                >
                  Cancelar
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave} 
                  disabled={loading || saveSuccess} 
                  className={`px-5 py-2 text-white rounded-lg text-sm font-bold transition shadow-md flex items-center justify-center gap-2 w-32 disabled:opacity-50 ${saveSuccess ? 'bg-green-500 hover:bg-green-600' : 'bg-brand-red hover:bg-red-700'}`}
                  aria-label="Salvar alterações no perfil"
                >
                  {(loading && !saveSuccess) ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> :
                   saveSuccess ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1"><Check className="w-4 h-4" aria-hidden="true" /> Salvo!</motion.div> :
                   <><Save className="w-4 h-4" aria-hidden="true" /> Salvar</>}
                </motion.button>
              </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
