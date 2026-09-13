import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, X } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { reportService } from '../../services/reportService';
import type { ReportPriority, WasteCategory } from '../../types/report';
import '../auth/Auth.css';
import './ReportWaste.css';

const CATEGORIES: { value: WasteCategory; label: string }[] = [
  { value: 'GENERAL', label: 'General Waste' },
  { value: 'PLASTIC', label: 'Plastic' },
  { value: 'PAPER', label: 'Paper & Cardboard' },
  { value: 'GLASS', label: 'Glass' },
  { value: 'METAL', label: 'Metal' },
  { value: 'E_WASTE', label: 'Electronic Waste (E-Waste)' },
  { value: 'ORGANIC', label: 'Organic / Food Waste' },
  { value: 'HAZARDOUS', label: 'Hazardous Materials' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITIES: { value: ReportPriority; label: string; hint: string }[] = [
  { value: 'LOW', label: 'Low', hint: 'Minor nuisance, no immediate health risk' },
  { value: 'MEDIUM', label: 'Medium', hint: 'Moderate issue, should be cleared soon' },
  { value: 'HIGH', label: 'High', hint: 'Urgent hazard or significant obstruction' },
];

export const ReportWaste: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState<WasteCategory>('GENERAL');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState<ReportPriority>('MEDIUM');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setErrors(prev => ({ ...prev, image: 'Only JPEG, PNG, and WebP images are allowed.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'Image must be smaller than 5 MB.' }));
      return;
    }
    setErrors(prev => ({ ...prev, image: '' }));
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (description.trim().length < 5) newErrors.description = 'Description must be at least 5 characters.';
    if (location.trim().length < 3) newErrors.location = 'Location must be at least 3 characters.';
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    setServerError(null);
    try {
      const created = await reportService.createReport(token!, {
        category, description: description.trim(), location: location.trim(), priority, image,
      });
      setSuccess(true);
      setTimeout(() => navigate(`/reports/${created.id}`), 1200);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="report-success">
        <div className="success-icon">✅</div>
        <h2>Report Submitted!</h2>
        <p>Your waste report has been successfully submitted. Redirecting to report details...</p>
      </div>
    );
  }

  return (
    <div className="report-waste-page">
      <div className="page-header">
        <h1 className="page-title">Report Waste</h1>
        <p className="page-subtitle">Help keep your community clean by reporting waste that needs collection.</p>
      </div>

      <div className="report-form-card">
        {serverError && (
          <div className="auth-error" role="alert">{serverError}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-section">
            <h2 className="form-section-title">Waste Details</h2>

            <div className="form-group">
              <label htmlFor="waste-category" className="form-label">Waste Category <span aria-hidden="true">*</span></label>
              <select
                id="waste-category"
                value={category}
                onChange={e => setCategory(e.target.value as WasteCategory)}
                disabled={loading}
                className="form-select"
                aria-required="true"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="waste-description" className="form-label">Description <span aria-hidden="true">*</span></label>
              <textarea
                id="waste-description"
                value={description}
                onChange={e => { setDescription(e.target.value); if (errors.description) setErrors(p => ({ ...p, description: '' })); }}
                placeholder="Describe the waste — type, quantity, and any hazards..."
                rows={4}
                disabled={loading}
                className={`form-textarea ${errors.description ? 'input-error' : ''}`}
                aria-required="true"
                aria-describedby={errors.description ? 'desc-error' : undefined}
              />
              {errors.description && <p id="desc-error" className="field-error" role="alert">{errors.description}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="waste-location" className="form-label">Location <span aria-hidden="true">*</span></label>
              <input
                id="waste-location"
                type="text"
                value={location}
                onChange={e => { setLocation(e.target.value); if (errors.location) setErrors(p => ({ ...p, location: '' })); }}
                placeholder="e.g., Near Central Park Gate, Sector 4"
                disabled={loading}
                className={`form-input ${errors.location ? 'input-error' : ''}`}
                aria-required="true"
                aria-describedby={errors.location ? 'location-error' : undefined}
              />
              {errors.location && <p id="location-error" className="field-error" role="alert">{errors.location}</p>}
              <p className="form-hint">Provide a clear, human-readable description of where the waste is located.</p>
            </div>
          </div>

          <div className="form-section">
            <h2 className="form-section-title">Priority & Photo</h2>

            <div className="form-group">
              <fieldset className="priority-fieldset">
                <legend className="form-label">Collection Priority</legend>
                <div className="priority-options">
                  {PRIORITIES.map(p => (
                    <label key={p.value} className={`priority-option ${priority === p.value ? 'priority-selected' : ''}`}>
                      <input
                        type="radio"
                        name="priority"
                        value={p.value}
                        checked={priority === p.value}
                        onChange={() => setPriority(p.value)}
                        disabled={loading}
                        className="sr-only"
                      />
                      <span className="priority-option-label">{p.label}</span>
                      <span className="priority-option-hint">{p.hint}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="form-group">
              <span className="form-label">Photo (Optional)</span>
              {!imagePreview ? (
                <label htmlFor="waste-image" className="image-upload-area">
                  <ImagePlus size={28} aria-hidden="true" />
                  <span className="upload-label">Click to upload or drag and drop</span>
                  <span className="upload-hint">JPEG, PNG, or WebP — max 5 MB</span>
                  <input
                    id="waste-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    disabled={loading}
                    className="sr-only"
                    aria-describedby={errors.image ? 'image-error' : undefined}
                  />
                </label>
              ) : (
                <div className="image-preview-wrap">
                  <img src={imagePreview} alt="Waste photo preview" className="image-preview" />
                  <button type="button" className="remove-image-btn" onClick={removeImage} aria-label="Remove photo">
                    <X size={16} />
                  </button>
                </div>
              )}
              {errors.image && <p id="image-error" className="field-error" role="alert">{errors.image}</p>}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost btn-md" onClick={() => navigate(-1)} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-md" disabled={loading}>
              {loading ? <><span className="btn-spinner" aria-hidden="true" />Submitting...</> : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
