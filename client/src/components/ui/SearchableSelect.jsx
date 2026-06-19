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

  const customStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: 'var(--bg-elevated)',
      borderColor: state.isFocused ? 'var(--primary-400)' : 'var(--border-color)',
      borderRadius: 'var(--radius-md)',
      minHeight: '42px',
      boxShadow: state.isFocused ? '0 0 0 1px var(--primary-400)' : 'none',
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
    })
  };

  // If running in dark mode, you might need to adjust variables, but we are using CSS variables which is perfect.
  return (
    <div style={style} className={className} id={id}>
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
