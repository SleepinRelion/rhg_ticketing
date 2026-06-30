import React, { useMemo } from 'react';
import Select from 'react-select';
import FormatCategory from './FormatCategory.jsx';

// Recursive helper to extract options from React children
const extractOptions = (children) => {
  let options = [];
  React.Children.forEach(children, (child) => {
    if (!child) return;
    if (child.type === 'option') {
      options.push({
        value: child.props.value !== undefined ? child.props.value : '',
        label: child.props.children
      });
    } else if (child.props && child.props.children) {
      options = options.concat(extractOptions(child.props.children));
    }
  });
  return options;
};

export default function SearchableSelect({ value, onChange, children, className, style, disabled, id, name, ...props }) {
  const options = useMemo(() => extractOptions(children), [children]);
  
  const selectedOption = useMemo(() => {
    return options.find(opt => String(opt.value) === String(value)) || null;
  }, [options, value]);

  const handleChange = (selected) => {
    if (onChange) {
      onChange({
        target: { 
          value: selected ? selected.value : '',
          name: name
        }
      });
    }
  };

  // Intercept layout styles for wrapper and visual styles for control
  const { 
    width, height, flex, flexGrow, flexShrink, margin, marginTop, marginBottom, marginLeft, marginRight,
    paddingLeft, padding, backgroundColor, border, borderColor, borderRadius,
    ...wrapperStyle 
  } = style || {};

  // Strip conflicting classes
  const wrapperClass = (className || '').replace(/\b(form-select|form-input)\b/g, '').trim();

  const customStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: state.isDisabled ? 'rgba(255, 255, 255, 0.05)' : (backgroundColor || 'var(--bg-secondary)'),
      borderColor: state.isFocused ? 'var(--primary-400)' : (borderColor || 'var(--border-color)'),
      borderRadius: borderRadius || 'var(--radius-md)',
      minHeight: height || '36px',
      height: height || 'auto',
      boxShadow: state.isFocused ? '0 0 0 1px var(--primary-400)' : 'none',
      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
      opacity: state.isDisabled ? 0.6 : 1,
      paddingLeft: paddingLeft || padding || 0,
      border: border || base.border,
      '&:hover': {
        borderColor: 'var(--primary-300)'
      }
    }),
    singleValue: (base) => ({
      ...base,
      color: 'var(--text-primary)'
    }),
    input: (base) => ({
      ...base,
      color: 'var(--text-primary)'
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--glass-shadow)',
      zIndex: 9999
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999 // Ensure it's higher than the modal overlay (200)
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected 
        ? 'var(--primary-500)' 
        : state.isFocused 
          ? 'var(--bg-hover)' 
          : 'transparent',
      color: state.isSelected ? '#ffffff' : 'var(--text-primary)',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: 'var(--primary-600)'
      }
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '2px 8px'
    }),
    indicatorSeparator: () => ({
      display: 'none'
    }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: '4px',
      color: 'var(--text-secondary)',
      '&:hover': {
        color: 'var(--text-primary)'
      }
    })
  };

  return (
    <div className={wrapperClass} style={{ 
      width: width || '100%', 
      flex, flexGrow, flexShrink, margin, marginTop, marginBottom, marginLeft, marginRight, ...wrapperStyle
    }} id={id}>
      <Select
        name={name}
        value={selectedOption}
        onChange={handleChange}
        options={options}
        styles={customStyles}
        isDisabled={disabled}
        isClearable={false}
        isSearchable={true}
        menuPosition="fixed"
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
        classNamePrefix="react-select"
        {...props}
      />
    </div>
  );
}
