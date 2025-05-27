import matplotlib.pyplot as plt
import datetime


def create_life_plot(birthday: str, output_filename: str):
    # 살아온 주와 총 주 계산
    today: datetime.date = datetime.date.today()
    birth_date: datetime.date = datetime.datetime.strptime(birthday, "%Y-%m-%d").date()
    days_lived: int = (today - birth_date).days
    years_lived: float = days_lived / 365.25
    weeks_lived: int = round(years_lived * 52)
    total_weeks: int = 52 * 90  # 90년의 수명을 가정 (총 90년)

    # 데이터 생성
    lived: list[bool] = [True] * weeks_lived + [False] * (total_weeks - weeks_lived)
    rows: int = 90
    cols: int = 52
    grid: list[list[bool]] = [
        [
            lived[row * cols + col] if row * cols + col < len(lived) else False
            for col in range(cols)
        ]
        for row in range(rows)
    ]

    # 데이터 플로팅
    fig, ax = plt.subplots(figsize=(8.5, 11))
    block_size: float = 0.75  # 여백을 더 많이 확보하기 위해 블록 크기 축소
    stroke_width: float = 0.3  # 블록의 선 두께 감소
    for y, row in enumerate(grid):
        for x, lived_week in enumerate(row):  # 'lived' 변수명 충돌 방지
            color: str = (
                str(0.3) if lived_week else "white"
            )  # 살아온 주를 회색조 값으로 사용
            rect: plt.Rectangle = plt.Rectangle(
                (x, -y),
                block_size,
                block_size,
                facecolor=color,
                edgecolor="black",
                linewidth=stroke_width,
            )
            ax.add_patch(rect)

    # 축 추가
    ax.set_xlim(0, cols)
    ax.set_ylim(-rows, 0)
    ax.set_aspect("equal", "box")
    ax.set_xticks(range(0, cols + 1, 10))  # 10주마다 주 눈금
    ax.set_yticks(range(0, -rows - 1, -10))  # 10년마다 주 눈금
    ax.set_xticklabels(range(0, cols + 1, 10), fontsize=8)
    ax.set_yticklabels([abs(y) for y in range(0, -rows - 1, -10)], fontsize=8)

    # 축 스타일 지정
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_visible(False)
    ax.spines["left"].set_visible(False)
    ax.tick_params(
        axis="x",
        bottom=False,
        labeltop=True,
        labelbottom=False,
        direction="out",
        length=0,
    )  # 레이블을 위에 표시
    ax.tick_params(axis="y", left=False, direction="out", length=0)

    # 제목 및 레이블
    ax.set_title("Your Life in Weeks", fontsize=16)
    ax.set_xlabel("Weeks in a Year", fontsize=12, labelpad=10)
    ax.set_ylabel("Age (Years)", fontsize=12, labelpad=10)

    # PDF로 저장
    plt.savefig(output_filename, format="pdf", bbox_inches="tight")
    plt.close()
