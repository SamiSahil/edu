import { useEffect, useState } from 'react';
import { Button } from '../ui/Button.jsx';
import { Checkbox } from '../ui/Checkbox.jsx';
import { Drawer } from '../ui/Drawer.jsx';
import { Input } from '../ui/Input.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Select } from '../ui/Select.jsx';
import { Textarea } from '../ui/Textarea.jsx';
import { useResponsive } from '../../hooks/useResponsive.js';
import { trimValue } from '../../lib/utils.js';

function normalizeServerErrors(details, message) {
  if (!details) return message ? { _form: message } : {};

  // backend CONFLICT pattern: { field: "code" } etc
  if (typeof details === 'object' && details.field && message) {
    return { [details.field]: message };
  }

  // backend VALIDATION_ERROR: zod flatten { fieldErrors, formErrors }
  if (typeof details === 'object' && details.fieldErrors) {
    const out = {};
    for (const [k, arr] of Object.entries(details.fieldErrors || {})) {
      if (Array.isArray(arr) && arr.length) out[k] = String(arr[0]);
    }
    if (details.formErrors?.length) out._form = details.formErrors.join('\n');
    return out;
  }

  if (typeof details === 'object' && details._form) {
    return { _form: String(details._form) };
  }

  return message ? { _form: message } : {};
}

function MultiCheck({ label, helperText, error, name, value = [], options = [], onChange }) {
  const selected = Array.isArray(value) ? value : [];

  const toggle = (v) => {
    const has = selected.includes(v);
    const next = has ? selected.filter((x) => x !== v) : [...selected, v];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {label ? <div className="text-sm font-medium text-zinc-200">{label}</div> : null}
      {helperText ? <div className="text-xs text-zinc-500">{helperText}</div> : null}
      {error ? <div className="text-xs text-rose-300">{error}</div> : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-200"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-400 focus:ring-emerald-400/30"
            />
            <span className="min-w-0 truncate">{opt.label}</span>
          </label>
        ))}
      </div>
      <input type="hidden" name={name} />
    </div>
  );
}

function renderField(field, values, errors, setValues) {
  const setFieldValue = (nextValue) => {
    setValues((current) => ({ ...current, [field.name]: nextValue }));
  };

  const common = {
    name: field.name,
    value: values[field.name] ?? '',
    label: field.label,
    helperText: field.helperText,
    error: errors[field.name],
    placeholder: field.placeholder,
    disabled: field.disabled,
  };

  const onChange = (event) => {
    if (field.type === 'checkbox') {
      setFieldValue(event.target.checked);
      return;
    }

    if (field.type === 'number') {
      const raw = event.target.value;
      if (raw === '') return setFieldValue('');
      const n = Number(raw);
      setFieldValue(Number.isFinite(n) ? n : '');
      return;
    }

    setFieldValue(event.target.value);
  };

  if (field.type === 'multicheck') {
    return (
      <MultiCheck
        key={field.name}
        name={field.name}
        label={field.label}
        helperText={field.helperText}
        error={errors[field.name]}
        value={values[field.name] || []}
        options={field.options || []}
        onChange={(next) => setFieldValue(next)}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <Select key={field.name} {...common} onChange={onChange}>
        <option value="">{field.placeholder || `Select ${field.label}`}</option>
        {field.options?.map((option) => (
          <option key={option.value ?? option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  }

  if (field.type === 'textarea') {
    return <Textarea key={field.name} {...common} onChange={onChange} rows={field.rows || 4} />;
  }

  if (field.type === 'checkbox') {
    return (
      <Checkbox
        key={field.name}
        label={field.label}
        helperText={field.helperText}
        checked={Boolean(values[field.name])}
        onChange={onChange}
        name={field.name}
      />
    );
  }

  return <Input key={field.name} {...common} type={field.type || 'text'} onChange={onChange} />;
}

export function RecordFormSheet({
  open,
  onClose,
  title,
  description,
  initialValues,
  sections = [],
  onSubmit,
  onValuesChange, // ✅ NEW
  submitLabel = 'Save',
  loading = false,
}) {
  const { isMobile } = useResponsive();
  const [values, setValues] = useState(initialValues || {});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues || {});
      setErrors({});
      setSubmitting(false);
    }
  }, [open, initialValues]);

  // ✅ NEW: notify parent on every values change while open
  useEffect(() => {
    if (!open) return;
    onValuesChange?.(values);
  }, [values, onValuesChange, open]);

  const validate = () => {
    const nextErrors = {};
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.required && !trimValue(values[field.name])) {
          nextErrors[field.name] = `${field.label} is required.`;
        }
        if (field.validate) {
          const error = field.validate(values[field.name], values);
          if (error) nextErrors[field.name] = error;
        }
      });
    });
    setErrors(nextErrors);
    return nextErrors;
  };

  const handleSubmit = async () => {
    const clientErrors = validate();
    if (Object.keys(clientErrors).length) return;

    setSubmitting(true);
    try {
      const result = await onSubmit?.(values);
      if (result && result.success === false) {
        const serverErrors = normalizeServerErrors(result.errors, result.message);
        if (Object.keys(serverErrors).length) setErrors((cur) => ({ ...cur, ...serverErrors }));
      }
      return result;
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (
    <>
      {errors._form ? (
        <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {errors._form}
        </div>
      ) : null}

      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title || 'section'} className="space-y-4">
            {section.title ? (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
                  {section.title}
                </h3>
                {section.description ? <p className="text-sm text-zinc-500">{section.description}</p> : null}
              </div>
            ) : null}

            <div className={section.grid || 'grid gap-4 sm:grid-cols-2'}>
              {section.fields.map((field) => renderField(field, values, errors, setValues))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button loading={loading || submitting} disabled={loading || submitting} onClick={handleSubmit}>
          {submitLabel}
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onClose={onClose} title={title} description={description} actions={null} placement="bottom">
        {shell}
      </Drawer>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} actions={null} width="max-w-4xl">
      {shell}
    </Modal>
  );
}