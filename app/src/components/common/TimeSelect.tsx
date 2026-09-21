interface TimeSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

const HOURS = Array.from(
  { length: 24 },
  (_, index) =>
    String(index).padStart(2, "0")
);

const MINUTES = Array.from(
  { length: 12 },
  (_, index) =>
    String(index * 5).padStart(2, "0")
);

function TimeSelect({
  id,
  value,
  onChange,
}: TimeSelectProps) {
  const [hour = "", minute = ""] =
    value
      ? value.split(":")
      : ["", ""];

  const handleHourChange = (
    newHour: string
  ) => {
    if (!newHour) {
      onChange("");
      return;
    }

    onChange(
      `${newHour}:${minute || "00"}`
    );
  };

  const handleMinuteChange = (
    newMinute: string
  ) => {
    if (!newMinute) {
      if (!hour) {
        onChange("");
        return;
      }

      onChange(`${hour}:00`);
      return;
    }

    onChange(
      `${hour || "00"}:${newMinute}`
    );
  };

  return (
    <div className="time-select">
      <select
        id={`${id}-hour`}
        value={hour}
        onChange={(event) =>
          handleHourChange(
            event.target.value
          )
        }
        aria-label="時"
      >
        <option value="">
          --
        </option>

        {HOURS.map((item) => (
          <option
            key={item}
            value={item}
          >
            {item}
          </option>
        ))}
      </select>

      <span
        className="time-select-separator"
        aria-hidden="true"
      >
        :
      </span>

      <select
        id={`${id}-minute`}
        value={minute}
        onChange={(event) =>
          handleMinuteChange(
            event.target.value
          )
        }
        aria-label="分"
      >
        <option value="">
          --
        </option>

        {MINUTES.map((item) => (
          <option
            key={item}
            value={item}
          >
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}

export default TimeSelect;