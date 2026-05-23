interface Props {
  on: boolean;
  onChange: (val: boolean) => void;
}

export default function Toggle({ on, onChange }: Props) {
  return (
    <div className={`toggle${on ? ' on' : ''}`} onClick={() => onChange(!on)}>
      <div className="toggle-knob" />
    </div>
  );
}
