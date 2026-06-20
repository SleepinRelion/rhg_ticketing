import React, { useMemo } from 'react';
import Select from 'react-select';

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
      backgroundColor: backgroundColor || 'var(--bg-secondary)',
      borderColor: state.isFocused ? 'var(--primary-400)' : (borderColor || 'var(--border-color)'),
      borderRadius: borderRadius || 'var(--radius-md)',
      minHeight: height || '36px',
      height: height || 'auto',
      boxShadow: state.isFocused ? '0 0 0 1px var(--primary-400)' : 'none',
      cursor: 'pointer',
      paddingLeft: paddingLeft || padding || 0,
      border: border || base.border,
      '&:hover': {
        borderColor: 'var(--primary-400)'
      }
    }),
    singleValue: (base) => ({
      ...base,
      color: 'var(--text-primary)',
      fontSize: '14px'
    }),
    input: (base) => ({
      ...base,
      color: 'var(--text-primary)',
      fontSize: '14px',
      margin: 0,
      padding: 0
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border-color)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      zIndex: 9999
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected 
        ? 'var(--primary-600)' 
        : state.isFocused 
          ? 'var(--primary-50)' 
          : 'transparent',
      color: state.isSelected 
        ? '#fff' 
        : state.isFocused 
          ? 'var(--primary-700)' 
          : 'var(--text-primary)',
      cursor: 'pointer',
      fontSize: '14px',
      '&:active': {
        backgroundColor: state.isSelected ? 'var(--primary-700)' : 'var(--primary-100)'
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
    <div style={{ width: width || '100%', flex, flexGrow, flexShrink, margin, marginTop, marginBottom, marginLeft, marginRight, ...wrapperStyle }} className={wrapperClass} id={id}>
      <Select
        value={selectedOption}
        onChange={handleChange}
        options={options}
        styles={customStyles}
        isDisabled={disabled}
        isClearable={false}
        isSearchable={true}
        classNamePrefix="react-select"
        {...props}
      />
    </div>
  );
}
