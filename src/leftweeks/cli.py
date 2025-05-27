import click
from .plot import create_life_plot
from .utils import validate_date, process_filename
from importlib.metadata import version, PackageNotFoundError

# 패키지 버전 정보 가져오기
try:
    __version__: str = version("lifeweeks")
except PackageNotFoundError:
    __version__ = "unknown"


@click.command(context_settings=dict(help_option_names=["-h", "--help"]))
@click.argument("birth_date", type=str)  # birthday → birth_date로 변수명 변경
@click.option(
    "--output",
    "-o",
    default="lifeweeks.pdf",
    help="출력 파일 이름 (기본값: lifeweeks.pdf)",
)
@click.version_option(
    __version__, "-v", "--version", help="버전 정보를 출력하고 종료합니다."
)
def main(birth_date: str, output: str) -> None:
    """
    \b
    입력한 생년월일로 주차별 인생 차트를 생성합니다.
    생년월일은 YY-MM-DD 형식으로 입력해야 합니다.

    예시: lifeweeks 1980-02-14
    """
    # 생년월일 형식 검증
    validate_date(birth_date)
    # 출력 파일명 처리
    output_filename: str = process_filename(output)
    # 인생 차트 생성
    create_life_plot(birth_date, output_filename)
    # 결과 출력
    click.echo(f"주차별 인생 차트가 {output_filename} 파일로 저장되었습니다.")
