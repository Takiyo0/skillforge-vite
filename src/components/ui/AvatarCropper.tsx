import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface AvatarCropperProps {
	imageSrc: string;
	onCropComplete: (croppedImage: File) => void;
	onCancel: () => void;
}

export function AvatarCropper({ imageSrc, onCropComplete, onCancel }: AvatarCropperProps) {
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [rotation, setRotation] = useState(0);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

	const onCropAreaChange = useCallback(
		(_croppedArea: any, croppedAreaPixels: any) => {
			setCroppedAreaPixels(croppedAreaPixels);
		},
		[]
	);

	const handleCropImage = async () => {
		if (!croppedAreaPixels) return;

		try {
			const canvas = (await getCroppedImg(imageSrc, croppedAreaPixels, rotation)) as HTMLCanvasElement;
			canvas.toBlob((blob: Blob | null) => {
				if (blob) {
					const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
					onCropComplete(file);
				}
			}, 'image/jpeg');
		} catch (error) {
			console.error('Error cropping image:', error);
		}
	};

	const handleZoomIn = () => {
		setZoom((prev) => Math.min(prev + 0.1, 3));
	};

	const handleZoomOut = () => {
		setZoom((prev) => Math.max(prev - 0.1, 1));
	};

	const handleRotate = () => {
		setRotation((prev) => (prev + 90) % 360);
	};

	return (
		<div className="fixed inset-0 bg-slate-950/75 backdrop-blur-2xl flex items-center justify-center z-50 p-4">
			<div className="glass-widget-shell rounded-[2rem] max-w-2xl w-full overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-8 py-6 border-b border-blue-200/20">
					<h2 className="text-2xl font-black text-slate-900 dark:text-white">Crop Avatar</h2>
					<button
						onClick={onCancel}
						className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors"
					>
						<X size={24} className="text-slate-600 dark:text-slate-300" />
					</button>
				</div>

				{/* Cropper Area */}
				<div className="relative w-full h-96 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
					<Cropper
						image={imageSrc}
						crop={crop}
						zoom={zoom}
						rotation={rotation}
						aspect={1}
						cropShape="round"
						showGrid={false}
						onCropChange={setCrop}
						onCropAreaChange={onCropAreaChange}
						onZoomChange={setZoom}
						onRotationChange={setRotation}
					/>
				</div>

				{/* Controls */}
				<div className="px-8 py-6 glass-widget-surface border-t border-blue-200/20 space-y-4">
					{/* Zoom Control */}
					<div>
						<label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
							Zoom
						</label>
						<div className="flex items-center space-x-4">
							<button
								onClick={handleZoomOut}
								className="p-2 glass-widget-inset hover:bg-blue-500/10 rounded-lg transition-colors"
							>
								<ZoomOut size={18} className="text-slate-700 dark:text-slate-200" />
							</button>
							<input
								type="range"
								min="1"
								max="3"
								step="0.1"
								value={zoom}
								onChange={(e) => setZoom(parseFloat(e.target.value))}
								className="flex-1 h-2 bg-slate-300/80 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
							/>
							<button
								onClick={handleZoomIn}
								className="p-2 glass-widget-inset hover:bg-blue-500/10 rounded-lg transition-colors"
							>
								<ZoomIn size={18} className="text-slate-700 dark:text-slate-200" />
							</button>
							<span className="text-sm font-bold text-slate-600 dark:text-slate-300 w-12 text-right">
								{Math.round(zoom * 100)}%
							</span>
						</div>
					</div>

					{/* Rotation Control */}
					<div>
						<label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
							Rotation
						</label>
						<button
							onClick={handleRotate}
							className="w-full flex items-center justify-center space-x-2 px-4 py-2 glass-widget-inset hover:bg-blue-500/10 rounded-lg transition-colors font-bold text-slate-700 dark:text-slate-200"
						>
							<RotateCw size={18} />
							<span>Rotate 90°</span>
						</button>
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-3 px-8 py-6 border-t border-blue-200/20">
					<button
						onClick={onCancel}
						className="flex-1 px-4 py-3 glass-widget-inset text-slate-900 dark:text-white font-black rounded-xl hover:bg-blue-500/10 transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={handleCropImage}
						className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black rounded-xl transition-colors shadow-lg shadow-blue-500/30"
					>
						Save Avatar
					</button>
				</div>
			</div>
		</div>
	);
}

/**
 * Helper function to get cropped image
 */
async function getCroppedImg(imageSrc: string, pixelCrop: any, rotation: number) {
	const image = new Image();
	image.src = imageSrc;

	return new Promise((resolve) => {
		image.onload = () => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');

			if (!ctx) return;

			const maxSize = Math.max(image.width, image.height);
			const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

			canvas.width = safeArea;
			canvas.height = safeArea;

			ctx.translate(safeArea / 2, safeArea / 2);
			ctx.rotate(getRadianAngle(rotation));
			ctx.translate(-safeArea / 2, -safeArea / 2);

			ctx.drawImage(
				image,
				safeArea / 2 - image.width / 2,
				safeArea / 2 - image.height / 2
			);

			const data = ctx.getImageData(0, 0, safeArea, safeArea);

			canvas.width = pixelCrop.width;
			canvas.height = pixelCrop.height;

			ctx.putImageData(
				data,
				Math.round(0 - safeArea / 2 + image.width / 2 - pixelCrop.x),
				Math.round(0 - safeArea / 2 + image.height / 2 - pixelCrop.y)
			);

			resolve(canvas);
		};
	});
}

function getRadianAngle(degreeValue: number) {
	return (degreeValue * Math.PI) / 180;
}
